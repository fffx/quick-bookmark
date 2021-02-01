import * as React from 'react';
import { CategoryItem, SEPARATOR} from './CategoryItem'
import Pinyin from 'tiny-pinyin'
import browser from 'webextension-polyfill';
import fuzzySearch from './searchEngine'
import * as helper from '../helper';

import './styles.scss';

function setPopupStyle(theme) {
    const myElement = document.getElementById("popup");
  
    if (theme.colors && theme.colors.frame) {
      document.body.style.backgroundColor =
        theme.colors.frame;
    } else {
      document.body.style.backgroundColor = "white";
    }
  
    if (theme.colors && theme.colors.toolbar) {
      myElement.style.backgroundColor = theme.colors.toolbar;
    } else {
      myElement.style.backgroundColor = "#ebebeb";
    }
    
    if (theme.colors && theme.colors.toolbar_text) {
      myElement.style.color = theme.colors.toolbar_text;
    } else {
      myElement.style.color = "black";
    }
}



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
            saveDomainOnly: false,
            resorted: false, // resort after child check conatains current tab
        }
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

    // Will resort after remove or add
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
    onKeyDown = (e) => {
        const { cursor, categoryNodes } = this.state

        console.debug('keydown', e.key)
        // arrow up/down button should select next/previous list element
        if (e.key === "ArrowUp") {
            e.preventDefault()
            // if(cursor <= 0) return;
            this.setState(prevState => ({
                cursor: cursor > 0 ? prevState.cursor - 1 : categoryNodes.length - 1
            }))
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            this.setState(prevState => ({
                cursor: cursor < categoryNodes.length - 1 ? prevState.cursor + 1 : 0
            }))
        } else if(e.key === 'Enter') {
            this.focusedCategoryItem.current.categoryItemRef.current.click();
        } else if(e.key === 'Delete' && this.focusedCategoryItem.current) {
            this.focusedCategoryItem.current.categoryItemRef.current.click();
        }
        this.setState({saveDomainOnly: e.shiftKey})
    }

//  TODO not fired
    onKeyUp = (e) => {
        console.log(`keyup ${e.key}, ${e.shiftKey}`)
        if(e.shiftKey){
            this.setState({saveDomainOnly: false})
        }
    }

    resetcategoryNodes() {
        const { isSupportPinyin, cursor } = this.state
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
                const texts = text.split('/').map(x => x.trim())
                const { rootNodes } = this.state
                const filteredNodes = this.state.fuzzySearch.search(texts[0])
                let newCursor = 0
                // console.debug(`best score: ${results[0]?.score}`)
                if (filteredNodes.length === 0 || filteredNodes[0].title != text) {
                    console.debug('rootNodes', rootNodes.length, rootNodes, filteredNodes)
                    const newBtns = []

                    texts[1] && filteredNodes.forEach( x=> {
                        newBtns.push({
                            title: texts[1], id: 'NEW',
                            parentTitle: x.titlePrefix || x.title,
                            parentId: x.id, children: []
                        })
                    })
                    rootNodes.map( x => {
                        newBtns.push({
                            title: text, id: 'NEW',
                            parentTitle: x.title,
                            parentId: x.id, children: []
                        })
                    })
                    if(!texts[1] && filteredNodes.length > 0) newCursor += newBtns.length
                    // console.debug("Not found ...", text)
                    this.setState({ categoryNodes: [...newBtns, ...filteredNodes], cursor: newCursor })
                } else {
                    this.setState({ categoryNodes: filteredNodes, cursor: newCursor })
                }

            } else {
                this.resetcategoryNodes()
            }
        }, 100);

        // TODO remember last filter?
        this.resetcategoryNodes()

        browser.windows.onFocusChanged.addListener(() => {
            // console.debug('focus--------------------')
            // TODO this not working
            this.filterInput.current.focus()
        })

        helper.getCurrentTab().then(currentTab => {
            let newCategoryNodes = [...this.state.categoryNodes]
            newCategoryNodes.forEach((node) => {
                if(node.children.find( x => x.url && helper.isSameBookmarkUrl(x.url, currentTab.url))){
                    console.log('containsCurrentTab===============', node.title)
                    node.containsCurrentTab = true
                }
            })

            this.setState({
                currentActiveTab: currentTab,
                categoryNodes: newCategoryNodes
            })
        })

 
        //  Only firefox support this
        // browser.theme.getCurrent().then( (theme) => setPopupStyle(theme) )
    }

    render() {
        const { categoryNodes, cursor, currentActiveTab, resorted, saveDomainOnly } = this.state
        // const filterInputValue = this.filterInput ? this.filterInput.value : ''
        // console.debug('categoryNodes', categoryNodes.length)
        return (
            <section id="popup">
                <input
                    id="search" ref={this.filterInput}
                    placeholder="Filter ..."
                    onKeyDown={this.onKeyDown}
                    onKeyUp={this.onkeyUp }
                    onChange={this.onInputChange}
                    onBlur={({ target }) => target.focus()} 
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
                            saveDomainOnly={saveDomainOnly}
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
