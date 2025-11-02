import React from 'react';
import { CategoryItem, SEPARATOR} from './CategoryItem'
import Pinyin from 'tiny-pinyin'
import browser from 'webextension-polyfill';
import fuzzySearch from './searchEngine'
import * as helper from '../helper';

import './styles.scss';
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
            isLoadingCurrentTab: true, // Add loading state
            maxVisibleItems: 50 // Limit rendered items for performance
        }
    }


    onInputChange = (e) => {
        helper.debounce(event => {
            const text = event.target.value
            if (text && text.length > 0) {
                const texts = text.split("/").map(x => x.trim())
                let lastPart = null
                let parentPath = text
                if(texts.length > 1) {
                    lastPart = texts.pop()
                    parentPath = texts.join(" / ")
                }
                const { rootNodes } = this.state
                const filteredNodes = this.state.fuzzySearch.search(text)
                let newCursor = 0
                
                // Check if we have an exact match for the full search text
                const hasExactMatch = filteredNodes.length > 0 && filteredNodes[0].title === text
                
                // For path searches, check if we have exact match for the child in the parent
                let hasExactPathMatch = false
                if(lastPart) {
                    const parentMatches = this.state.fuzzySearch.search(parentPath)
                    if(parentMatches.length > 0 && parentMatches[0].title === parentPath) {
                        // Check if the child exists in the matched parent
                        const fullPath = `${parentMatches[0].titlePrefix ? `${parentMatches[0].titlePrefix} / ${parentMatches[0].title}` : parentMatches[0].title} / ${lastPart}`
                        hasExactPathMatch = filteredNodes.some(node => {
                            const nodePath = node.titlePrefix ? `${node.titlePrefix} / ${node.title}` : node.title
                            return nodePath === fullPath || node.title === lastPart && node.titlePrefix && node.titlePrefix.includes(parentMatches[0].title)
                        })
                    }
                }
                
                // console.debug(`best score: ${results[0]?.score}`)
                if (!hasExactMatch && !hasExactPathMatch) {
                    console.debug('rootNodes', rootNodes.length, rootNodes, filteredNodes)
                    const newBtns = []

                    // If we have a path like "foo / bar", search for parent directories matching "foo"
                    if(lastPart) {
                        const parentMatches = this.state.fuzzySearch.search(parentPath)
                        // Limit to top 5 parent matches for performance
                        const limitedParentMatches = parentMatches.slice(0, 5)
                        if(limitedParentMatches.length > 0) {
                            // Found matching parent directories, offer to create child in each
                            limitedParentMatches.forEach(x => {
                                newBtns.push({
                                    title: lastPart, id: 'NEW',
                                    parentTitle: x.titlePrefix ? `${x.titlePrefix} / ${x.title}` : x.title,
                                    parentId: x.id, children: []
                                })
                            })
                        } else {
                            // Parent doesn't exist, offer to create under top 5 filtered results
                            filteredNodes.slice(0, 5).forEach(x => {
                                newBtns.push({
                                    title: lastPart, id: 'NEW',
                                    parentTitle: x.titlePrefix ? `${x.titlePrefix} / ${x.title}` : x.title,
                                    parentId: x.id, children: []
                                })
                            })
                        }
                    }
                    
                    // Also offer to create the full search text under root folders (only if not a path search)
                    if(!lastPart) {
                        rootNodes.forEach(x => {
                            newBtns.push({
                                title: text, id: 'NEW',
                                parentTitle: x.title,
                                parentId: x.id, children: []
                            })
                        })
                    }
                    
                    if(!lastPart && filteredNodes.length > 0) newCursor += newBtns.length
                    // console.debug("Not found ...", text)
                    this.setState({ categoryNodes: [...newBtns, ...filteredNodes], cursor: newCursor })
                } else {
                    this.setState({ categoryNodes: filteredNodes, cursor: newCursor })
                }

            } else {
                this.initBookmarkNodes()
            }
        }, 150)(e);
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
            categoryNodes: categoryNodes.sort(helper.sortNodes)
        })
    }

    // https://stackoverflow.com/questions/42036865/react-how-to-navigate-through-list-by-arrow-keys
    onKeyDown = (e) => {
        const { cursor, categoryNodes } = this.state
        this.checkShiftHolding(e)
        // console.debug('keydown', e.key)
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
    }

    checkShiftHolding(e){
        if(e.altKey){
            this.setState({saveDomainOnly: true})
        }
    }
    onKeyUp = (e) => {
        if(e.key === 'Alt'){
            this.setState({saveDomainOnly: false})
        }
    }

    initBookmarkNodes() {
        const { isSupportPinyin, cursor } = this.state

        // Load bookmarks and current tab in parallel
        Promise.all([
            browser.bookmarks.getTree(),
            helper.getCurrentTab().catch(() => null) // Don't fail if tab query fails
        ]).then(([bookmarkItems, currentTab]) => {
            const browserName = helper.getBrowserName()
            const categoryNodes = helper.filterRecursively(bookmarkItems, null, (node) => {
                if (browserName === "firefox") {
                    return !node.url && node.title;
                } else {
                    return !node.url && node.id > 0
                }
            })

            // Build URL map for faster lookup if we have a current tab
            let urlMap = null
            if (currentTab && currentTab.url) {
                urlMap = new Map()
                const currentUrl = helper.removeHashtag(currentTab.url)
                categoryNodes.forEach(node => {
                    if (node.children && node.children.length > 0) {
                        for (let i = 0; i < node.children.length; i++) {
                            if (node.children[i].url) {
                                const bookmarkUrl = helper.removeHashtag(node.children[i].url)
                                if (bookmarkUrl === currentUrl) {
                                    urlMap.set(node.id, true)
                                    break
                                }
                            }
                        }
                    }
                })
            }

            // Process nodes in single pass - combine pinyin and containsCurrentTab
            const chineseRegex = isSupportPinyin ? /[\u3400-\u9FBF]/ : null
            categoryNodes.forEach(node => {
                // Add pinyin if supported
                if (chineseRegex && chineseRegex.test(node.title)) {
                    node.pinyinTitle = Pinyin.convertToPinyin(node.title, ' ', true)
                } else if (isSupportPinyin) {
                    node.pinyinTitle = node.title
                }
                
                // Set containsCurrentTab from map
                node.containsCurrentTab = urlMap ? (urlMap.get(node.id) === true) : false
            })

            // Sort once at the end
            const sortedNodes = categoryNodes.sort(helper.sortNodes)

            this.setState({
                rootNodes: bookmarkItems[0].children,
                categoryNodes: sortedNodes,
                currentActiveTab: currentTab,
                cursor: sortedNodes.length > cursor ? cursor : 0,
                fuzzySearch: new fuzzySearch(categoryNodes)
            })
        }, this.onRejected)
    }
    componentDidMount() {
        // TODO remember last filter?
        this.initBookmarkNodes()

        browser.windows.onFocusChanged.addListener(() => {
            // console.debug('focus--------------------')
            // TODO this not working
            this.filterInput.current.focus()
        })
    }

    render() {
        const { categoryNodes, cursor, currentActiveTab, resorted, saveDomainOnly, maxVisibleItems } = this.state
        // Limit visible items for performance - show items around cursor
        const visibleNodes = categoryNodes.length > maxVisibleItems 
            ? (() => {
                const halfVisible = Math.floor(maxVisibleItems / 2)
                const start = Math.max(0, cursor - halfVisible)
                const end = Math.min(categoryNodes.length, start + maxVisibleItems)
                return categoryNodes.slice(start, end)
            })()
            : categoryNodes
        
        const startIndex = categoryNodes.length > maxVisibleItems 
            ? Math.max(0, cursor - Math.floor(maxVisibleItems / 2))
            : 0
            
        // const filterInputValue = this.filterInput ? this.filterInput.value : ''
        // console.debug('categoryNodes', categoryNodes.length)
        return (
            <section id="popup">
                <input
                    id="search" ref={this.filterInput}
                    placeholder="Filter ..."
                    onKeyDown={this.onKeyDown}
                    onKeyUp={this.onKeyUp}
                    onChange={this.onInputChange}
                    autoComplete="off"
                    onBlur={({ target }) => target.focus()}
                    autoFocus={true}></input>
                <div id="wrapper">
                    {visibleNodes.map((node, visibleIndex) => {
                        const index = startIndex + visibleIndex
                        return(<CategoryItem
                            node={node} key={`${node.id}-${node.parentId}`}
                            focused={cursor === index}
                            currentActiveTab={currentActiveTab}
                            updateCategoryNode={this.updateCategoryNode}
                            resortCategoryNodes={this.resortCategoryNodes}
                            isLast={index === categoryNodes.length - 1}
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

export default Popup;
