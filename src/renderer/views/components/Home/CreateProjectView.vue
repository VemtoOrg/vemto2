<script setup lang="ts">
    import { ref, Ref, onMounted, defineEmits } from "vue"
    import { CheckIcon, PlusCircleIcon } from "@heroicons/vue/24/outline"
    import UiButton from "@Renderer/components/ui/UiButton.vue"
    import UiModal from "@Renderer/components/ui/UiModal.vue"
    import Main from "@Renderer/services/wrappers/Main"
    import Alert from "@Renderer/components/utils/Alert"
    import UiText from "@Renderer/components/ui/UiText.vue"
    import UiPathSelector from "@Renderer/components/ui/UiPathSelector.vue"
    import UiCheckbox from "@Renderer/components/ui/UiCheckbox.vue"
    import debounce from "@Common/tools/debounce"
    import ProjectCreator, { ProjectCreatorData } from "@Renderer/services/project/ProjectCreator"
    import PathUtil from "@Common/util/PathUtil"
    import UiSelect from "@Renderer/components/ui/UiSelect.vue"
    import UiLoading from "@Renderer/components/ui/UiLoading.vue"

    const showingModal = ref(false)
    
    const settings = ref({}) as Ref<ProjectCreatorData>,
        errors = ref({}) as Ref<any>,
        creatingProject = ref(false),
        checkingDependencies = ref(false),
        currentState = ref(""),
        projectCreator = new ProjectCreator()

    const emit = defineEmits(["reloadProjectListAndOpenPath"])

    const show = async () => {
        checkingDependencies.value = true

        const composerInstalled = await Main.API.composerIsInstalled()
        
        checkingDependencies.value = false

        if(!composerInstalled) {
            Alert.warning("Composer was not found. <br/><br/> Please install Composer or set the correct path in the settings to create a new app. <br/><br/> <b>If you are on Windows</b>, you may also need to execute Vemto as an administrator (depending on the way you installed Composer).", 7000)
            return
        }

        showingModal.value = true
        errors.value = {}

        const lastSelectedProjectPath = localStorage.getItem("lastSelectedProjectPath")
        if(lastSelectedProjectPath) {
            settings.value.path = lastSelectedProjectPath
        }
    }

    const create = async () => {
        if(creatingProject.value) return

        const validated = await validate()
        if(!validated) {
            creatingProject.value = false
            return
        }

        createProject()
    }

    const validate = async () => {
        if(!settings.value.path?.length) {
            errors.value.path = "The path is required"
        }

        const folderExists = await Main.API.folderExists(settings.value.path)
        if(!folderExists) {
            errors.value.path = "The path does not exist"
        }

        if(!settings.value.name?.length) {
            errors.value.name = "The name is required"
        }

        if(!settings.value.starterKit?.length) {
            errors.value.starterKit = "The starter kit is required"
        }

        if(!settings.value.database?.length) {
            errors.value.database = "The database is required"
        }

        return !Object.values(errors.value).length
    }

    const createProject = () => {
        creatingProject.value = true

        Main.API.folderExists(settings.value.completePath)
            .then((folderExists: boolean) => {
                if(folderExists) {
                    Alert.error("The folder already exists")
                    creatingProject.value = false
                    
                    return
                }

                settings.value.completePath = PathUtil.join(settings.value.path, settings.value.name)

                projectCreator.create(settings.value, (state) => currentState.value = state)
                    .then(() => {
                        if(projectCreator.hasErrors) return

                        Alert.success("App created successfully")

                        close()
                        emit("reloadProjectListAndOpenPath", settings.value.completePath)
                        
                        resetSettings()
                    })
                    .finally(() => {
                        currentState.value = ""
                        creatingProject.value = false
                    })
            })
            .catch((error) => {
                Alert.error(error.message)
                creatingProject.value = false
            })
    }

    const close = () => {
        showingModal.value = false
    }

    const onProjectNameChanged = debounce(() => {
        const regex = /^([a-zA-Z0-9\-\_]*)$/g

        if (regex.test(settings.value.name)) {
            delete errors.value.name
            return
        }

        errors.value.name = "Invalid project name"
    }, 250)

    const onProjectPathChanged = debounce(() => {
        if(!settings.value.path?.length) {
            errors.value.path = "The path is required"
            return
        }

        delete errors.value.path

        localStorage.setItem("lastSelectedProjectPath", settings.value.path)
    }, 250)

    const resetSettings = () => {
        settings.value = {
            path: "",
            name: "",
            starterKit: "react",
            database: "mysql"
        } as ProjectCreatorData
    }

    const onStarterKitChanged = () => {
        if(!["react", "jetstream", "breeze", "empty", "api"].includes(settings.value.starterKit)) {
            errors.value.starterKit = "Invalid starter kit"
            return
        }

        delete errors.value.starterKit

        if(settings.value.starterKit != "jetstream") {
            settings.value.usesJetstreamTeams = false
        }
    }

    const onDatabaseChanged = () => {
        if(!["sqlite", "mysql", "mariadb", "pgsql", "sqlsrv"].includes(settings.value.database)) {
            errors.value.database = "Invalid database"
            return
        }

        delete errors.value.database
    }

    onMounted(() => {
        resetSettings()
    })
</script>
<template>
    <div>
        <UiButton class="gap-1.5" @click="show()">
            <div v-if="checkingDependencies">
                <UiLoading :stroke-width="2"></UiLoading> 
            </div>
            <div v-else>
                <PlusCircleIcon class="w-5 h-5 text-red-500" />
            </div>
            New App
        </UiButton>

        <UiModal
            title="Create New App"
            :show="showingModal"
            :processing="creatingProject"
            @close="close()"
            width="700px"
        >
            <div class="space-y-2 p-4">
                <div>
                    <UiPathSelector v-model="settings.path" label="Project Path" @input="onProjectPathChanged" />

                    <template v-if="errors.path !== undefined">
                        <span class="dark:text-red-500 text-sm pl-2">{{ errors.path }}</span>
                    </template>
                </div>

                <div>
                    <UiText v-model="settings.name" label="App Name" @input="onProjectNameChanged" />

                    <template v-if="errors.name !== undefined">
                        <span class="dark:text-red-500 text-sm pl-2">{{ errors.name }}</span>
                    </template>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <UiSelect v-model="settings.starterKit" label="UI Starter Kit" @change="onStarterKitChanged">
                            <option value="react">React Starter Kit</option>
                            <option value="jetstream">Jetstream</option>
                            <option value="breeze">Breeze</option>
                            <option value="api">API</option>
                            <option value="empty">Empty</option>
                        </UiSelect>

                        <template v-if="errors.starterKit !== undefined">
                            <span class="dark:text-red-500 text-sm pl-2">{{ errors.starterKit }}</span>
                        </template>
                    </div>

                    <div>
                        <UiSelect v-model="settings.database" label="Database" @change="onDatabaseChanged">
                            <option value="sqlite">SQLite</option>
                            <option value="mysql">MySQL</option>
                            <option value="mariadb">MariaDB</option>
                            <option value="pgsql">PostgreSQL</option>
                            <option value="sqlsrv">SQL Server</option>
                        </UiSelect>

                        <template v-if="errors.database !== undefined">
                            <span class="dark:text-red-500 text-sm pl-2">{{ errors.database }}</span>
                        </template>
                    </div>
                </div>

                <div class="flex flex-col">
                    <div v-if="settings.starterKit === 'jetstream'">
                        <UiCheckbox v-model="settings.usesJetstreamTeams" label="Use Jetstream Teams" />
                    </div>

                    <div>
                        <UiCheckbox v-model="settings.mustInstallFilament" label="Install Filament" />
                    </div>
                </div>
            </div>

            <div v-if="creatingProject" class="space-y-2 p-4 mt-2 bg-slate-950 rounded-b-lg border-t border-slate-700">
                <span class="text-sm">{{ currentState }}</span>
                <span class="points-animation relative"></span>
            </div>

            <template #footer>
                <div class="flex justify-end p-2">
                    <UiButton @click="create()">
                        <CheckIcon class="h-4 w-4 mr-1 text-green-500" />
                        <span>Create App</span>
                    </UiButton>
                </div>
            </template>
        </UiModal>
    </div>
</template>
<style>
.points-animation::after {
    content: '.';
    animation: points 1.5s infinite;
}

@keyframes points {
    45% {
        content: '..';
    }
    80% {
        content: '...';
    }
}
</style>