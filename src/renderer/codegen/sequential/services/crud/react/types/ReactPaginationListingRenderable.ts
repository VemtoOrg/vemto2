import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import { RenderableFileFormatter, RenderableFileType } from "@Common/models/RenderableFile"

export default class ReactPaginationListingRenderable extends Renderable {
    crud: Crud

    constructor(crud: Crud) {
        super()

        this.crud = crud
    }

    canRender(): boolean {
        return true
    }

    getType(): RenderableFileType {
        return RenderableFileType.TSX
    }

    getTemplateFile(): string {
        return "crud/react/types/PaginationListing.vemtl"
    }

    getPath(): string {
        return "resources/js/types"
    }

    getFilename(): string {
        return "pagination-listing.d.ts"
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.TSX
    }

    getData() {
        return {
            crud: this.crud,
        }
    }
}
