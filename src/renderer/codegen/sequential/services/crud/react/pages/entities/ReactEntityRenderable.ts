import * as changeCase from "change-case"
import Crud from "@Common/models/crud/Crud"
import Renderable from "@Renderer/codegen/sequential/services/foundation/Renderable"
import { RenderableFileFormatter, RenderableFileType } from "@Common/models/RenderableFile"

export default class ReactEntityRenderable extends Renderable {
    crud: Crud

    constructor(crud: Crud) {
        super()

        this.crud = crud
    }

    canRender(): boolean {
        return true
    }

    getType(): RenderableFileType {
        return RenderableFileType.TS
    }

    getTemplateFile(): string {
        return "crud/react/pages/entities/Entity.vemtl"
    }

    getPath(): string {
        const viewsFolder = this.crud.section.getFolderName()
        const folder = changeCase.paramCase(this.crud.plural)
        return `resources/js/pages/${viewsFolder}/${folder}/entities`
    }

    getFilename(): string {
        return `${this.crud.name}.entity.ts`
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.TS
    }

    getData() {
        return {
            crud: this.crud,
            entityName: `${this.crud.model.name}`,
            columns: this.crud.model.table.getColumns(),
            resolveTsType: (columnType: string) => this.resolveTsType(columnType),
        }
    }

    resolveTsType(type: string): { tsType: string; initialValue: any } {
        switch (type) {
            case "bigInteger":
            case "decimal":
            case "double":
            case "float":
            case "integer":
            case "mediumInteger":
            case "smallInteger":
            case "tinyInteger":
            case "year":
            case "foreignId":
                return { tsType: "number", initialValue: 0 }

            case "boolean":
                return { tsType: "boolean", initialValue: false }

            case "char":
            case "enum":
            case "ipAddress":
            case "macAddress":
            case "longText":
            case "mediumText":
            case "string":
            case "text":
            case "uuid":
            case "ulid":
            case "lineString":
            case "multiLineString":
            case "multiPoint":
            case "multiPolygon":
            case "multiPolygonZ":
            case "point":
            case "polygon":
            case "geometry":
            case "geography":
            case "geometryCollection":
            case "set":
            case "time":
            case "timeTz":
                return { tsType: "string", initialValue: `""` }

            case "date":
            case "dateTime":
            case "dateTimeTz":
            case "timestamp":
            case "timestampTz":
                return { tsType: "Date", initialValue: "new Date()" }

            case "binary":
                return { tsType: "Buffer", initialValue: Buffer.from([]) }

            case "json":
            case "jsonb":
                return { tsType: "any", initialValue: {} }

            default:
                return { tsType: "any", initialValue: null }
        }
    }
}
