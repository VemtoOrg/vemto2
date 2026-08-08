import * as changeCase from "change-case"
import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import { RenderableFileFormatter, RenderableFileType } from "@Common/models/RenderableFile"

export default class ReactRouteWebRenderable extends Renderable {
    cruds: Crud[]

    constructor(cruds: Crud[]) {
        super()

        this.cruds = cruds
    }

    canRender(): boolean {
        return true
    }

    getType(): RenderableFileType {
        return RenderableFileType.PHP
    }

    getTemplateFile(): string {
        return "crud/react/routes/Web.vemtl"
    }

    getPath(): string {
        return "routes"
    }

    getFilename(): string {
        return "web.php"
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.PHP
    }

    getData() {
        return {
            cruds: this.cruds,
            changeCase: changeCase,
        }
    }

    addDependencies() {}
}
