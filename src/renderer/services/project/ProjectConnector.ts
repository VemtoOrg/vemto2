import Main from "../wrappers/Main"
import SchemaBuilder from "../schema/SchemaBuilder"
import Project, { ProjectSettings, ProjectUIStarterKit } from "@Common/models/Project"
import GenerateBasicProjectData from "@Renderer/services/project/GenerateBasicProjectData"
import BootstrapAppRenderable from "@Renderer/codegen/sequential/services/routes/BootstrapAppRenderable"
import RoutesRenderable from "@Renderer/codegen/sequential/services/routes/RoutesRenderable"
import ApiRoutesRenderable from "@Renderer/codegen/sequential/services/routes/ApiRoutesRenderable"

export default class ProjectConnector {
    project: Project
    projectSettings: ProjectSettings

    constructor(project: Project) {
        this.project = project
    }

    async connect(settings: ProjectSettings) {
        try {
            if (this.project.connectionFinished) {
                const projectSettings = settings || this.project.settings
                this.setProjectSettingsDefaults(projectSettings)

                return await this.project.save()
            }

            this.projectSettings = settings
            this.setProjectSettingsDefaults(settings)

            await this.createVemtoFolder()
            await this.doFirstSchemaSync()
            await this.generateBasicProjectData()
            await this.createNecessaryFiles()
            await this.saveProject()
            await this.organizeTables()

            this.project.refresh()
        } catch (error) {
            throw error
        }
    }

    async createVemtoFolder() {
        console.log("Creating vemto folder")
        await Main.API.copyInternalFolderIfNotExists("vemto-folder-base", ".vemto")
    }

    async createNecessaryFiles() {
        if (!this.projectSettings.isFreshLaravelProject) {
            console.log("Skip creating files for non-fresh Laravel project")
            return
        }

        console.log("Creating files for fresh Laravel project")

        if (!this.isReact()) {
            // Render the bootstrap/app.php file (ignoring conflicts)
            const renderableBootstrapApp = new BootstrapAppRenderable()
            await renderableBootstrapApp.render(true)

            const renderableRoutes = new RoutesRenderable()
            await renderableRoutes.render(true)

            const renderableApiRoutes = new ApiRoutesRenderable()
            await renderableApiRoutes.render(true)
        }

        if (this.isReact()) {
            console.log("Creating files for React project")
            const templatesPath = "file-templates/starter-kits/react/resources"
            await Main.API.copyInternalFolderToProject(templatesPath, "/")
        }

        if (this.isBreezeLivewire()) {
            console.log("Creating files for Breeze project")
            const templatesPath = "file-templates/starter-kits/breeze-livewire/resources"
            await Main.API.copyInternalFolderToProject(templatesPath, "/")
        }

        if (this.isJetstreamLivewire()) {
            console.log("Creating files for Jetstream Livewire project")
            const templatesPath = "file-templates/starter-kits/jetstream-livewire/resources"

            await Main.API.copyInternalFolderToProject(templatesPath, "/")
        }
    }

    async doFirstSchemaSync() {
        if (this.project.connectionFinished) {
            throw new Error("Project connection is already finished, cannot do first schema sync")
        }

        const schemaBuilder = new SchemaBuilder(this.project),
            syncTables = true,
            syncModels = true

        return await schemaBuilder.build(syncTables, syncModels)
    }

    isReact() {
        return this.projectSettings.uiStarterKit === ProjectUIStarterKit.REACT && this.projectSettings.usesReact
    }

    isBreezeLivewire() {
        return this.projectSettings.uiStarterKit === ProjectUIStarterKit.BREEZE && this.projectSettings.usesLivewire
    }

    isJetstreamLivewire() {
        return this.projectSettings.uiStarterKit === ProjectUIStarterKit.JETSTREAM && this.projectSettings.usesLivewire
    }

    async generateBasicProjectData() {
        const defaultDataGenerator = new GenerateBasicProjectData(this.project)

        await defaultDataGenerator.handle()
    }

    setProjectSettingsDefaults(settings: ProjectSettings) {
        this.project.settings = settings
    }

    async saveProject() {
        this.project.connectionFinished = true
        this.project.canIgnoreNextSchemaSourceChanges = true

        return await this.project.save()
    }

    async organizeTables() {
        this.project.organizeTablesOfAllSectionsByRelations()
    }
}
