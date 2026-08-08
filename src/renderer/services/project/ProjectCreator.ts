import Main from "../wrappers/Main"
import PathUtil from "@Common/util/PathUtil"
import BreezeInstaller from "./installer/composer/BreezeInstaller"
import FilamentInstaller from "./installer/composer/FilamentInstaller"
import JetstreamInstaller from "./installer/composer/JetstreamInstaller"
import ApiInstaller from "./installer/composer/ApiInstaller"
import ReactInstaller from "@Renderer/services/project/installer/composer/ReactInstaller"

export interface ProjectCreatorData {
    name: string
    path: string
    completePath: string
    starterKit: string
    database: string

    // Jetstream options
    usesJetstreamTeams: boolean

    // Filament options
    mustInstallFilament: boolean
}

export default class ProjectCreator {
    hasErrors: boolean = false
    data: ProjectCreatorData | null = null
    stateCallback: ((state: string) => void) | null = null

    async create(data: ProjectCreatorData, stateCallback: (state: string) => void) {
        this.data = data
        this.stateCallback = stateCallback

        try {
            await this.createProject()
            await this.generateStorageLink()

            await this.fixFolderPermissions(this.data.completePath)

            await this.installStarterKit()
            await this.changeDatabase()

            if (this.data.mustInstallFilament) {
                await FilamentInstaller.installFromProjectCreator(this.data, stateCallback)
            }

            await this.fixFolderPermissions(this.data.completePath)

            this.data = null
            this.hasErrors = false
            this.stateCallback = null
        } catch (error: any) {
            this.hasErrors = true

            return
        }
    }

    async createProject() {
        this.stateCallback("Creating project, please wait! This may take a while")
        if (this.data.starterKit === "react") {
            this.stateCallback("Installing React Starter Kit")
            await Main.API.executeComposerOnPath(this.data.path, `create-project laravel/react-starter-kit ${this.data.name} --stability=dev`)
        } else {
            await Main.API.executeComposerOnPath(this.data.path, `create-project --prefer-dist laravel/laravel ${this.data.name}`)
        }
    }

    async generateStorageLink() {
        this.stateCallback("Generating storage link")

        await Main.API.executeArtisanOnPath(this.data.completePath, "storage:link")
    }

    async installStarterKit() {
        const starterKitInstallers = {
            react: ReactInstaller,
            api: ApiInstaller,
            breeze: BreezeInstaller,
            fortify: FilamentInstaller,
            jetstream: JetstreamInstaller,
        }

        const installer = starterKitInstallers[this.data.starterKit]

        if (!installer) return

        await installer.installFromProjectCreator(this.data, this.stateCallback)
    }

    async changeDatabase() {
        if (this.data.database === "sqlite") return

        this.stateCallback("Changing database to " + this.data.database)

        await Main.API.readFile(PathUtil.join(this.data.completePath, ".env"))
            .then(async (fileContent: string) => {
                fileContent = fileContent.toString().replace("DB_CONNECTION=sqlite", `DB_CONNECTION=${this.data.database}`)

                await Main.API.writeFile(PathUtil.join(this.data.completePath, ".env"), fileContent)
            })
            .catch((error) => {
                console.log(error)
                throw new Error("Could not open .env file")
            })
    }

    async fixFolderPermissions(path: string) {
        this.stateCallback("Fixing folder permissions")

        await Main.API.fixFolderPermissions(path)
    }
}
