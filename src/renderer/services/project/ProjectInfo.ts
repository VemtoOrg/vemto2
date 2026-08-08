import Main from "../wrappers/Main"
import PathUtil from "@Common/util/PathUtil"
import { ProjectCssFramework, ProjectUIStarterKit } from "@Common/models/Project"
import { validateAndParse as getVersionMatches } from "compare-versions/lib/esm/utils"
import EnvParser from "@Common/util/EnvParser"

export default class ProjectInfo {
    path: string
    composerData: any = {}
    packageData: any = {}
    envData: EnvParser
    settingsData: EnvParser
    hasSettingsFile: boolean = false
    alreadyConnected: boolean = false
    phpVersion: string = ""
    isLaravelProject: boolean = false
    laravelVersion: string = ""
    hasJetstream: boolean = false
    jetsreamVersion: string = ""
    hasBreeze: boolean = false
    breezeVersion: string = ""
    hasLaravelUi: boolean = false
    laravelUiVersion: string = ""
    hasSanctum: boolean = false
    sanctumVersion: string = ""
    hasFortify: boolean = false
    fortifyVersion: string = ""
    hasTailwind: boolean = false
    tailwindVersion: string = ""
    hasLivewire: boolean = false
    livewireVersion: string = ""
    hasBootstrap: boolean = false
    bootstrapVersion: string = ""
    hasInertia: boolean = false
    inertiaVersion: string = ""
    hasVue: boolean = false
    vueVersion: string = ""
    hasReact: boolean = false
    reactVersion: string = ""
    hasSvelte: boolean = false
    svelteVersion: string = ""

    constructor(path: string) {
        this.path = path
    }

    async read() {
        this.composerData = await this.readComposerJson()
        this.packageData = await this.readPackageJson()
        this.envData = await this.readEnvFile()
        this.settingsData = await this.readSettingsFile()

        this.alreadyConnected = await this.isAlreadyConnected()
        this.hasSettingsFile = await this.checkForSettingsFile()

        this.phpVersion = this.getComposerPackageVersion("php") || "8.0"
        this.isLaravelProject = this.hasComposerPackage("laravel/framework")
        this.laravelVersion = this.getComposerPackageVersion("laravel/framework")
        this.hasJetstream = this.hasComposerPackage("laravel/jetstream")
        this.jetsreamVersion = this.getComposerPackageVersion("laravel/jetstream")
        this.hasBreeze = this.hasComposerPackage("laravel/breeze") || this.hasComposerDevPackage("laravel/breeze")
        this.breezeVersion = this.getComposerPackageVersion("laravel/breeze") || this.getComposerPackageVersion("laravel/breeze")
        this.hasLaravelUi = this.hasComposerPackage("laravel/ui")
        this.laravelUiVersion = this.getComposerPackageVersion("laravel/ui")
        this.hasSanctum = this.hasComposerPackage("laravel/sanctum")
        this.sanctumVersion = this.getComposerPackageVersion("laravel/sanctum")
        this.hasFortify = this.hasComposerPackage("laravel/fortify")
        this.fortifyVersion = this.getComposerPackageVersion("laravel/fortify")
        this.hasTailwind = this.hasPackageDependency("tailwindcss")
        this.tailwindVersion = this.getPackageDependencyVersion("tailwindcss")
        this.hasLivewire = this.hasComposerPackage("livewire/livewire")
        this.livewireVersion = this.getComposerPackageVersion("livewire/livewire")
        this.hasBootstrap = this.hasPackageDependency("bootstrap")
        this.bootstrapVersion = this.getPackageDependencyVersion("bootstrap")
        this.hasInertia = this.hasPackageDependency("@inertiajs/inertia")
        this.inertiaVersion = this.getPackageDependencyVersion("@inertiajs/inertia")
        this.hasVue = this.hasPackageDependency("vue")
        this.vueVersion = this.getPackageDependencyVersion("vue")
        this.hasReact = this.hasPackageDependency("react")
        this.reactVersion = this.getPackageDependencyVersion("react")
        this.hasSvelte = this.hasPackageDependency("svelte")
        this.svelteVersion = this.getPackageDependencyVersion("svelte")
    }

    getStarterKit(): ProjectUIStarterKit {
        if (this.hasReact) return ProjectUIStarterKit.REACT
        if (this.hasJetstream) return ProjectUIStarterKit.JETSTREAM
        if (this.hasBreeze) return ProjectUIStarterKit.BREEZE
        if (this.hasLaravelUi) return ProjectUIStarterKit.LARAVEL_UI

        return ProjectUIStarterKit.OTHER
    }

    getCssFramework(): ProjectCssFramework {
        if (this.hasTailwind) return ProjectCssFramework.TAILWIND
        if (this.hasBootstrap) return ProjectCssFramework.BOOTSTRAP

        return ProjectCssFramework.OTHER
    }

    hasComposerPackage(packageName: string): boolean {
        return !!this.composerData.require && !!this.composerData.require[packageName]
    }

    hasComposerDevPackage(packageName: string): boolean {
        return !!this.composerData["require-dev"] && !!this.composerData["require-dev"][packageName]
    }

    getComposerPackageVersion(packageName: string): string {
        const hasComposerPackage = this.hasComposerPackage(packageName),
            hasComposerDevPackage = this.hasComposerDevPackage(packageName)

        if (!hasComposerPackage && !hasComposerDevPackage) return ""

        let packageVersion: string[] = [],
            sliceLength: number = 0,
            composerVersion = this.composerData.require[packageName] || this.composerData["require-dev"][packageName]

        if (composerVersion === "*") return "*"

        try {
            packageVersion = getVersionMatches(composerVersion)
            sliceLength = packageVersion[1] !== undefined ? 2 : 1
        } catch (error) {
            return ""
        }

        return packageVersion.slice(0, sliceLength).join(".")
    }

    hasPackageDependency(packageName: string): boolean {
        return (
            (!!this.packageData.devDependencies && !!this.packageData.devDependencies[packageName]) ||
            (!!this.packageData.dependencies && !!this.packageData.dependencies[packageName])
        )
    }

    getPackageDependencyVersion(packageName: string): string {
        if (!this.packageData.dependencies && !this.packageData.devDependencies) {
            return ""
        }

        if (!this.packageData.devDependencies) {
            return this.packageData.dependencies[packageName] || ""
        }

        return this.packageData.devDependencies[packageName] || (!!this.packageData.dependencies && this.packageData.dependencies[packageName]) || ""
    }

    async readComposerJson(): Promise<any> {
        try {
            const composerData = await Main.API.readFile(PathUtil.join(this.path, "composer.json"))

            return JSON.parse(composerData) || {}
        } catch (e) {
            return {}
        }
    }

    async readPackageJson(): Promise<any> {
        try {
            const packageData = await Main.API.readFile(PathUtil.join(this.path, "package.json"))

            return JSON.parse(packageData) || {}
        } catch (e) {
            return {}
        }
    }

    async readEnvFile(): Promise<any> {
        try {
            const envData = await Main.API.readFile(PathUtil.join(this.path, ".env"))

            return new EnvParser(envData)
        } catch (e) {
            return new EnvParser()
        }
    }

    async readSettingsFile(): Promise<any> {
        try {
            let settingsData = await Main.API.readFile(PathUtil.join(this.path, ".vemto_settings"))

            if (!settingsData) {
                settingsData = await Main.API.readFile(PathUtil.join(this.path, ".vemto_settings.example"))
            }

            if (!settingsData) {
                return new EnvParser()
            }

            return new EnvParser(settingsData)
        } catch (e) {
            return new EnvParser()
        }
    }

    async isAlreadyConnected(): Promise<boolean> {
        const vemtoFolder = PathUtil.join(this.path, ".vemto")

        return await Main.API.folderExists(vemtoFolder)
    }

    async checkForSettingsFile(): Promise<boolean> {
        const settingsFile = PathUtil.join(this.path, ".vemto_settings")

        return await Main.API.fileExists(settingsFile)
    }
}
