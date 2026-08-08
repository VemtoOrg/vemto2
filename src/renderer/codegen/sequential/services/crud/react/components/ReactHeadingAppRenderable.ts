import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import { RenderableFileFormatter, RenderableFileType } from "@Common/models/RenderableFile"

export default class ReactHeadingAppRenderable extends Renderable {
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
        return "crud/react/components/HeadingApp.vemtl"
    }

    getPath(): string {
        return "resources/js/components"
    }

    getFilename(): string {
        return "HeadingApp.tsx"
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
