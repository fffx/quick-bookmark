import * as React from 'react';
import browser from 'webextension-polyfill';
const SEPARATOR = ' / '
export default class Item extends React.Component {
    constructor(props){
        this.state = {
            active: false
        }
    }

    render(){
        const node = this.props.node
        const { id } = node
        const count = node.children.length
        const title = node.titlePrefix ? node.titlePrefix + SEPARATOR + node.title : node.title;

        return (<span data-id={id} data-count={count} data-title={title} >
            {title}
        </span>)
    }
}