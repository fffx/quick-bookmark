import * as React from 'react';
import CategoryItem from './CategoryItem'
import Pinyin from 'tiny-pinyin'
import Fuse from 'fuse.js'
import browser from 'webextension-polyfill';
import * as helper from '../helper';

import './styles.scss';

const filterRecursively = (nodeArray, childrenProperty, filterFn, results, titlePrefix) => {
    results = results || [];
    nodeArray.forEach(function (node) {
        node.titlePrefix = node.titlePrefix && titlePrefix ? titlePrefix + SEPARATOR + node.titlePrefix : titlePrefix
        if (filterFn(node)) results.push(node);

        var nextPrefix = node.id > 0 ? node.title : ''
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
            fuseOptions: {
                keys: isSupportPinyin ? ['pinyinTitle', 'firstLetter'] : ['title'],
                threshold: 0.3,
                findAllMatches: true,
                isCaseSensitive: false
            },
            isSupportPinyin: isSupportPinyin,
            categoryNodes: [],
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
        console.log('update category node', index, newNodeProps)
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
        // arrow up/down button should select next/previous list element
        if (e.key === "ArrowUp") {
            this.setState(prevState => ({
                cursor: cursor > 0 ? prevState.cursor - 1 : categoryNodes.length - 1
            }))
        } else if (e.key === "ArrowDown") {
            this.setState(prevState => ({
                cursor: cursor < categoryNodes.length - 1 ? prevState.cursor + 1 : 0
            }))
        } else if(e.key === 'Enter') {
            // console.log('---------------', this.focusedCategoryItem.current)
            this.focusedCategoryItem.current.categoryItemRef.current.click();
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
                        // console.log(x.title)
                        x.pinyinTitle = Pinyin.convertToPinyin(x.title, ' ', true)
                    } else {
                        x.pinyinTitle = x.title
                    }
                    x.firstLetter = x.pinyinTitle.match(/\b\w/g).join('')
                    // console.log(`pinyinTitle: ${x.pinyinTitle}, firstLetter: ${x.firstLetter}`)
                    return x;
                });
            }

            this.setState({
                categoryNodes: categoryNodes,
                cursor: categoryNodes.length > cursor ? cursor : 0,
                fuzzySearch: new Fuse(categoryNodesWithPinyin || categoryNodes, fuseOptions)
            })
        }, this.onRejected)
    }
    componentDidMount() {
        this.delayedFilter = helper.debounce(event => {
            const text = event.target.value
            if (text && text.length > 0) {
                const results = this.state.fuzzySearch.search(text)
                const filteredNodes = results.map(x => x.item);
                let newCursor = 0
                // console.log(`best score: ${results[0]?.score}`)
                if (filteredNodes.length === 0 || !filteredNodes[0].title != text) {
                    const newBtn = {
                        title: text,
                        id: 'NEW',
                        children: []
                    }
                    if(filteredNodes.length > 0) newCursor += 1
                    console.log("Not found ...", text)
                    this.setState({ categoryNodes: [newBtn, ...filteredNodes], cursor: newCursor })
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
            // console.log('focus--------------------')
            // TODO this not working
            this.filterInput.current.focus()
        })

        helper.getCurrentUrlData( (url, title) => {
            // console.log('set currentActiveTab', url)
            this.setState({currentActiveTab: {url: url, title: title}})
        })
    }

    render() {
        const { categoryNodes, cursor, currentActiveTab, resorted } = this.state
        // const filterInputValue = this.filterInput ? this.filterInput.value : ''
        // console.log('categoryNodes', categoryNodes.length)
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
                            node={node} key={node.id}
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
