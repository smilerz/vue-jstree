import TreeItem from './tree-item.vue'
import './less/style.less'

let ITEM_ID = 0
let ITEM_HEIGHT_SMALL = 18
let ITEM_HEIGHT_DEFAULT = 24
let ITEM_HEIGHT_LARGE = 32

export default {
  name: 'VJstree',
  props: {
    data: {type: Array},
    size: {type: String, validator: value => ['large', 'small'].indexOf(value) > -1},
    showCheckbox: {type: Boolean, default: false},
    wholeRow: {type: Boolean, default: false},
    noDots: {type: Boolean, default: false},
    multiple: {type: Boolean, default: false},
    allowBatch: {type: Boolean, default: false},
    textFieldName: {type: String, default: 'text'},
    valueFieldName: {type: String, default: 'value'},
    async: {type: Function},
    loadingText: {type: String, default: 'Loading...'},
    draggable: {type: Boolean, default: false},
    klass: String
  },
  render (h) {
    return h('div', {
      attrs: {
        role: 'tree'
      },
      class: this.classes,
      on: {
        selectstart: () => false
      }
    }, [
      h('ul', { class: this.containerClasses, role: 'group' },
        this.data.map((child, index) => {
          return h('tree-item', {
            key: index,
            props: {
              data: child,
              textFieldName: this.textFieldName,
              valueFieldName: this.valueFieldName,
              wholeRow: this.wholeRow,
              showCheckbox: this.showCheckbox,
              height: this.sizeHight,
              parentItem: this.data,
              draggable: this.draggable,
              onItemClick: this.onItemClick,
              onItemToggle: this.onItemToggle,
              onItemDragStart: this.onItemDragStart,
              onItemDragEnd: this.onItemDragEnd,
              onItemDrop: this.onItemDrop,
              klass: index === this.data.length - 1 ? 'tree-last' : ''
            },
            scopedSlots: {
              default: props => {
                return h('span', props.text)
              }
            }
          })
        })
      )
    ])
  },
  data () {
    return {
      draggedItem: null
    }
  },
  computed: {
    classes () {
      return [
        {'tree': true},
        {'tree-default': !this.size},
        {[`tree-default-${this.size}`]: !!this.size},
        {'tree-checkbox-selection': !!this.showCheckbox},
        {[this.klass]: !!this.klass}
      ]
    },
    containerClasses () {
      return [
        {'tree-container-ul': true},
        {'tree-children': true},
        {'tree-wholerow-ul': !!this.wholeRow},
        {'tree-no-dots': !!this.noDots}
      ]
    },
    sizeHight () {
      switch (this.size) {
        case 'large':
          return ITEM_HEIGHT_LARGE
        case 'small':
          return ITEM_HEIGHT_SMALL
        default:
          return ITEM_HEIGHT_DEFAULT
      }
    }
  },
  methods: {
    initializeData (items) {
      if (items && items.length > 0) {
        for (let i in items) {
          var dataItem = this.initializeDataItem(items[i])
          items[i] = dataItem
          this.initializeData(items[i].children)
        }
      }
    },
    initializeDataItem (item) {
      function Model (item, textFieldName, valueFieldName) {
        this.id = item.id || ITEM_ID++
        this[textFieldName] = item[textFieldName] || ''
        this[valueFieldName] = item[valueFieldName] || item[textFieldName]
        this.icon = item.icon || ''
        this.opened = item.opened || false
        this.selected = item.selected || false
        this.disabled = item.disabled || false
        this.loading = item.loading || false
        this.children = item.children || []
      }
      return new Model(item, this.textFieldName, this.valueFieldName)
    },
    initializeLoading () {
      var item = {}
      item[this.textFieldName] = this.loadingText
      item.disabled = true
      item.loading = true
      return this.initializeDataItem(item)
    },
    handleRecursionNodeChilds (node, func) {
      if (node.$children && node.$children.length > 0) {
        for (let childNode of node.$children) {
          if (!childNode.disabled) {
            func(childNode)
            this.handleRecursionNodeChilds(childNode, func)
          }
        }
      }
    },
    onItemClick (oriNode, oriItem) {
      if (this.multiple) {
        if (this.allowBatch) {
          this.handleBatchSelectItems(oriNode, oriItem)
        }
      } else {
        this.handleSingleSelectItems(oriNode, oriItem)
      }
      this.$emit('item-click', oriNode, oriItem)
    },
    handleSingleSelectItems (oriNode, oriItem) {
      this.handleRecursionNodeChilds(this, node => {
        node.model.selected = false
      })
      oriNode.model.selected = true
    },
    handleBatchSelectItems (oriNode, oriItem) {
      this.handleRecursionNodeChilds(oriNode, node => {
        if (node.model.disabled) return
        node.model.selected = oriNode.model.selected
      })
    },
    onItemToggle (oriNode, oriItem) {
      if (oriNode.model.opened) {
        this.handleAsyncLoad(oriNode.model.children, oriNode, oriItem)
      }
    },
    handleAsyncLoad (oriParent, oriNode, oriItem) {
      var self = this
      if (this.async) {
        if (oriParent[0].loading) {
          this.async(oriNode, (data) => {
            if (data.length > 0) {
              for (let i in data) {
                data[i].children = [self.initializeLoading()]
                var dataItem = self.initializeDataItem(data[i])
                self.$set(oriParent, i, dataItem)
              }
            } else {
              oriNode.model.children = []
            }
          })
        }
      }
    },
    onItemDragStart (e, oriNode, oriItem) {
      if (!this.draggable) { return false }

      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text', null)
      this.draggedItem = {
        item: oriItem,
        parentItem: oriNode.parentItem,
        index: oriNode.parentItem.indexOf(oriItem)
      }
    },
    onItemDragEnd (e, oriNode, oriItem) {
      if (!this.draggable) { return false }
      this.draggedItem = null
    },
    onItemDrop (e, oriNode, oriItem) {
      if (!this.draggable) {
        return false
      }

      if (this.draggedItem) {
        if (this.draggedItem.parentItem === oriItem.children ||
          this.draggedItem.item === oriItem ||
          (oriItem.children && oriItem.children.indexOf(this.draggedItem.item) !== -1)) {
          return
        }
        oriItem.children = oriItem.children ? oriItem.children.concat(this.draggedItem.item) : [this.draggedItem.item]
        oriItem.opened = true
        this.$emit('item-drop', this.draggedItem.item, oriItem)

        var self = Object.assign({}, this)
        this.$nextTick(() => {
          self.draggedItem.parentItem.splice(self.draggedItem.index, 1)
        })
      }
    }
  },
  mounted () {
    this.initializeData(this.data)
    console.log(this.$slots)

    if (this.async) {
      this.$set(this.data, 0, this.initializeLoading())
      this.handleAsyncLoad(this.data, this)
    }
  },
  components: {
    TreeItem
  },
  watch: {
    data () {
      this.initializeData(this.data)
    }
  }
}
