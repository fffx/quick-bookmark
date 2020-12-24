import * as React from 'react';
import CategoryItem from './CategoryItem'
import Pinyin from 'tiny-pinyin'
import browser from 'webextension-polyfill';
import fuzzySearch from './searchEngine'
import * as helper from '../helper';

import './styles.scss';
const SEPARATOR = ' / '

const filterRecursively = (nodeArray, childrenProperty, filterFn, results, titlePrefix) => {
    results = results || [];
    nodeArray.forEach(function (node) {
        node.titlePrefix = titlePrefix ? `${titlePrefix}${SEPARATOR}${node.title}` : null

        if (filterFn(node)) results.push(node);

        var nextPrefix = node.id > 0 ? node.titlePrefix || node.title : ''
        if (node.children) filterRecursively(node.children, childrenProperty, filterFn, results, nextPrefix);
    });

    return results;

};
class Popup extends React.Component {
    constructor(props) {
        super(props)
        this.focusedCategoryItem = React.createRef();
        this.categoryItemRefs =  []
        this.filterInput = React.createRef();

        const isSupportPinyin = Pinyin.isSupported()
        this.state = {
            isSupportPinyin: isSupportPinyin,
            categoryNodes: [],
            rootNodes: [],
            currentActiveTab: null,
            cursor: 0,
            resorted: false, // resort after child check conatains current tab
        }
    }

    removeCurrentTab(){
        helper.getCurrentUrlData((url, _title) => {
            const currendNode = this.focusedCategoryItem?.current.props.node.children.find(x => x.url === url )
            if(!currendNode) return

            browser.bookmarks.remove(currendNode.id).then( () => {
                this.resetcategoryNodes()
                window.close()
            })
        })
    }

    onInputChange = (e) => {
        this.delayedFilter(e);
    }
    onRejected = (error) => {
        alert(error)
    }
    updateCategoryNode = (index, newNodeProps) =>{
        // Yeah update categoryNodes directly, 
        console.debug('update category node', index, newNodeProps)
        this.state.categoryNodes[index] = Object.assign(this.state.categoryNodes[index], newNodeProps)
    }

    resortCategoryNodes = () => {
        const {categoryNodes} = this.state
        this.setState({
            resorted: true,
            categoryNodes: categoryNodes.sort( (a, b) => {
                if(a.containsCurrentTab && !b.containsCurrentTab){
                    return -1
                } else if(b.containsCurrentTab && !a.containsCurrentTab){
                    return 1
                } else {
                    return b.dateGroupModified - a.dateGroupModified;
                }
            })
        })
    }

    // https://stackoverflow.com/questions/42036865/react-how-to-navigate-through-list-by-arrow-keys
    onKeydown = (e) => {
        const { cursor, categoryNodes } = this.state

        console.debug('keydown', e.key)
        // arrow up/down button should select next/previous list element
        if (e.key === "ArrowUp") {
            e.preventDefault()
            this.setState(prevState => ({
                cursor: cursor > 0 ? prevState.cursor - 1 : categoryNodes.length - 1
            }))
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            this.setState(prevState => ({
                cursor: cursor < categoryNodes.length - 1 ? prevState.cursor + 1 : 0
            }))
        } else if(e.key === 'Enter') {
            console.debug('---------------', this.focusedCategoryItem.current)
            if(this.focusedCategoryItem.current.categoryItemRef.current.classList.contains('contains-current-tab')){
                this.removeCurrentTab()
            } else {
                this.focusedCategoryItem.current.categoryItemRef.current.click();
            }
        } else if(e.key === 'Delete' && this.focusedCategoryItem.current) {
            this.removeCurrentTab()
        }
    }

    resetcategoryNodes() {
        const { fuseOptions, isSupportPinyin, cursor } = this.state
        // const currentTab = await browser.tabs.query({'active': true, 'currentWindow': true})[0]
        browser.bookmarks.getTree().then(bookmarkItems => {
            const categoryNodes = filterRecursively(bookmarkItems, "children", function (node) {
                return !node.url && node.id > 0;
            }).sort(function (a, b) {
                return b.dateGroupModified - a.dateGroupModified;
            })

            // wrapper.style.width = wrapper.clientWidth + "px";
            let categoryNodesWithPinyin = null
            if (isSupportPinyin) {
                categoryNodesWithPinyin = categoryNodes.map(x => {
                    if (x.title.match(/[\u3400-\u9FBF]/)) {
                        // console.debug(x.title)
                        x.pinyinTitle = Pinyin.convertToPinyin(x.title, ' ', true)
                    } else {
                        x.pinyinTitle = x.title
                    }
                    x.firstLetter = x.pinyinTitle.match(/\b\w/g).join('')
                    // console.debug(`pinyinTitle: ${x.pinyinTitle}, firstLetter: ${x.firstLetter}`)
                    return x;
                });
            }

            this.setState({
                resorted: false,
                rootNodes: bookmarkItems[0].children,
                categoryNodes: categoryNodes,
                cursor: categoryNodes.length > cursor ? cursor : 0,
                fuzzySearch: new fuzzySearch(categoryNodesWithPinyin || categoryNodes)
            })
        }, this.onRejected)
    }
    componentDidMount() {
        this.delayedFilter = helper.debounce(event => {
            const text = event.target.value
            if (text && text.length > 0) {
                const filteredNodes = this.state.fuzzySearch.search(text)
                let newCursor = 0
                // console.debug(`best score: ${results[0]?.score}`)
                if (filteredNodes.length === 0 || filteredNodes[0].title != text) {
                    console.debug('rootNodes', this.state.rootNodes.length, this.state.rootNodes)
                    const newBtns = this.state.rootNodes.map( x => {
                        return {
                            title: text,
                            id: 'NEW',
                            parentTitle: x.title,
                            parentId: x.id,
                            children: []
                        }
                    })
                    if(filteredNodes.length > 0) newCursor += newBtns.length
                    // console.debug("Not found ...", text)
                    this.setState({ categoryNodes: [...newBtns, ...filteredNodes], cursor: newCursor })
                } else {
                    this.setState({ categoryNodes: filteredNodes, cursor: newCursor })
                }

            } else {
                this.resetcategoryNodes()
            }
        }, 300);

        // TODO remember last filter?
        this.resetcategoryNodes()

        browser.windows.onFocusChanged.addListener(() => {
            // console.debug('focus--------------------')
            // TODO this not working
            this.filterInput.current.focus()
        })

        helper.getCurrentUrlData( (url, title) => {
            // console.debug('set currentActiveTab', url)
            this.setState({currentActiveTab: {url: url, title: title}})
        })
    }

    render() {
        const { categoryNodes, cursor, currentActiveTab, resorted } = this.state
        // const filterInputValue = this.filterInput ? this.filterInput.value : ''
        // console.debug('categoryNodes', categoryNodes.length)
        return (
            <section id="popup">
                <input
                    id="search" ref={this.filterInput}
                    placeholder="Filter ..."
                    onKeyDown={this.onKeydown} 
                    onChange={this.onInputChange} 
                    autoFocus={true}></input>
                <div id="wrapper">
                    {categoryNodes.map((node, index) => {
                        return(<CategoryItem
                            node={node} key={`${node.id}-${node.parentId}`}
                            focused={cursor === index}
                            currentActiveTab={currentActiveTab}
                            updateCategoryNode={this.updateCategoryNode}
                            resortCategoryNodes={this.resortCategoryNodes}
                            isLast={categoryNodes.length - 1 === index}
                            index={index}
                            resorted={resorted}
                            ref={cursor === index ? this.focusedCategoryItem : null}
                        />)
                    })}
                </div>
            </section>
        );
    }
}

// TOOD
/*
 * edit, remove, move node
*/

export default Popup;
