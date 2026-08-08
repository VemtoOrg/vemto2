import * as changeCase from "change-case"
import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import { RenderableFileFormatter, RenderableFileType } from "@Common/models/RenderableFile"

export default class ReactFormRenderable extends Renderable {
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
        return "crud/react/pages/form/Form.vemtl"
    }

    getPath(): string {
        const viewsFolder = this.crud.section.getFolderName()
        const folder = changeCase.paramCase(this.crud.model.plural)
        return `resources/js/pages/${viewsFolder}/${folder}/form`
    }

    getFilename(): string {
        return `${this.crud.name}.form.tsx`
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.TSX
    }

    getData() {
        const inputTypes: string[] = Array.from(new Set(this.crud.inputs.map((input) => input.type)))
        return {
            crud: this.crud,
            project: this.project,
            inputTypes: inputTypes,
            viewsFolder: this.crud.section.getFolderName(),
            changeCase: changeCase,
        }
    }

    addDependencies() {}
}
