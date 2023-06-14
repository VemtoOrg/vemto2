import Index from "@Common/models/Index"
import Column from "@Common/models/Column"

export default new class FillIndexColumns {
    index: Index

    onIndex(index: Index) {
        this.setIndex(index)
        this.fill()
    }

    setIndex(index: Index): FillIndexColumns {
        this.index = index

        return this
    }

    fill() {
        if(!this.index.columns || !this.index.columns.length) return

        this.index.columns.forEach((columnName: string) => {
            const column: Column = this.index.table.findColumnByName(columnName)

            if(!column) return

            this.index.relation("indexColumns").attachUnique(column)
        })
    }
}