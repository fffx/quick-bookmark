import Fuse from 'fuse.js'
class FuseIndex {
    fuseOptions = {
        keys: ['pinyinTitle', 'firstLetter', 'title', 'titlePrefix'],
        threshold: 0.3,
        findAllMatches: false,
        isCaseSensitive: false
    }
    constructor(categoryNodes){
        this.fuse = new Fuse(categoryNodes, this.fuseOptions)
    }

    search(str){
        return this.fuse.search(str).map(x => x.item);
    }
}

export default FuseIndex
