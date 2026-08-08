import * as changeCase from "change-case"
import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import {
    RenderableFileFormatter,
    RenderableFileType,
} from "@Common/models/RenderableFile"

export default class ReactRouteAppRenderable extends Renderable {
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
        return "crud/react/routes/App.vemtl"
    }

    getPath(): string {
        return "routes/app"
    }

    getFilename(): string {
        return `${changeCase.paramCase(this.crud.plural)}.php`
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.PHP
    }

    getData() {
        return {
            crud: this.crud,
            folderName: this.crud.model.plural,
            modelName: changeCase.paramCase(this.crud.model.name),
            controllerName: this.crud.model.getControllerName(),
            routeName: changeCase.paramCase(this.crud.model.plural),
        }
    }

    addDependencies() {}
}
