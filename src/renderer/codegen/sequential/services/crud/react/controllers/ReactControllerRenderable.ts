import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import { RenderableFileFormatter, RenderableFileType } from "@Common/models/RenderableFile"
import * as changeCase from "change-case"

export default class ReactControllerRenderable extends Renderable {
    crud: Crud

    constructor(crud: Crud) {
        super()

        this.crud = crud
    }

    canRender(): boolean {
        return true
    }

    getType(): RenderableFileType {
        return RenderableFileType.PHP
    }

    getTemplateFile(): string {
        return "crud/react/controllers/Controller.vemtl"
    }

    getPath(): string {
        return `app/Http/Controllers/${this.crud.plural}`
    }

    getFilename(): string {
        return `${this.crud.model.getControllerName()}.php`
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.PHP
    }

    getData() {
        return {
            crud: this.crud,
            project: this.project,
            viewsFolder: this.crud.section.getFolderName(),
            changeCase: changeCase,
            controllerName: this.crud.model.getControllerName(),
            routeName: changeCase.paramCase(this.crud.model.plural),
        }
    }
}
