import Main from "@Renderer/services/wrappers/Main"
import { ProjectCreatorData } from "../../ProjectCreator"

export default class ReactInstaller {
    static async installFromProjectCreator(data: ProjectCreatorData, stateCallback: (state: string) => void = () => {}) {
        stateCallback("Installing Pest")
        await Main.API.executeComposerOnPath(data.completePath, "remove phpunit/phpunit --dev --no-update")
        await Main.API.executeComposerOnPath(data.completePath, "require pestphp/pest pestphp/pest-plugin-laravel --no-update --dev")
        await Main.API.executeComposerOnPath(data.completePath, "update")

        stateCallback("Running Pest tests to generate configuration files")
        await Main.API.executeComposerOnPath(data.completePath, "require pestphp/pest-plugin-drift --dev")
        await Main.API.executePhpOnPath(data.completePath, "echo no | ./vendor/bin/pest --drift")

        stateCallback("Removing Pest Drift")
        await Main.API.executeComposerOnPath(data.completePath, "remove pestphp/pest-plugin-drift --dev")

        stateCallback("Install motion")
        await Main.API.executeYarnOnPath(data.completePath, "add motion")

        stateCallback("Install use-debounce")
        await Main.API.executeYarnOnPath(data.completePath, "add use-debounce")

        stateCallback("Install shadcn/ui components")
        await Main.API.executeYarnOnPath(data.completePath, "yes | npx shadcn@latest add --all")
    }
}
