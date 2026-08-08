import * as changeCase from "change-case"
import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import { RenderableFileFormatter, RenderableFileType } from "@Common/models/RenderableFile"

export default class ReactCreatePageRenderable extends Renderable {
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
        return "crud/react/pages/CreatePage.vemtl"
    }

    getPath(): string {
        const viewsFolder = this.crud.section.getFolderName()
        const folder = changeCase.paramCase(this.crud.model.plural)
        return `resources/js/pages/${viewsFolder}/${folder}`
    }

    getFilename(): string {
        return "create.tsx"
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.TSX
    }

    getData() {
        return {
            crud: this.crud,
            viewsFolder: this.crud.section.getFolderName(),
            changeCase: changeCase,
        }
    }

    addDependencies() {}
}
