import os from "os"
import path from "path"
import { exec, ExecException } from "child_process"
import Storage from "@Main/services/Storage"
import FileSystem from "./FileSystem"

export default class CommandExecutor {

    static async executePhpOnPath(executionPath: string, command: string, plainReturn:boolean = false): Promise<string> {
        const phpPath = await Storage.get("phpPath") || "php",
            phpCommand = `${phpPath} -d display_errors=on ${command}`

        return await this.executeOnPath(executionPath, phpCommand, plainReturn)
    }

    static async executeCommand(command: string, plainReturn: boolean = false): Promise<string> {
        return await this.executeOnPath("", command, plainReturn)
    }
    
    static async executeArtisanOnPath(executionPath: string, command: string, plainReturn:boolean = false): Promise<string> {
        const phpPath = await Storage.get("phpPath") || "php",
            artisanCommand = `"${phpPath}" artisan ${command}`

        return await this.executeOnPath(executionPath, artisanCommand, plainReturn)
    }

    static async executeComposerOnPath(executionPath: string, command: string, plainReturn:boolean = false): Promise<string> {
        const composerPath = await Storage.get("composerPath") || "composer",
            composerCommand = `${composerPath} ${command}`

        return await this.executeOnPath(executionPath, composerCommand, plainReturn)
    }

    static async executeYarnOnPath(executionPath: string, command: string, plainReturn:boolean = false): Promise<string> {
        const yarnPath = await Storage.get("yarnPath") || "yarn",
            yarnCommand = `${yarnPath} ${command}`

        return await this.executeOnPath(executionPath, yarnCommand, plainReturn)
    }

    static async executeOnPath(executionPath: string, command: string, plainReturn: boolean = false): Promise<string> {
        const isDevelopment = process.env.NODE_ENV === "development"

        if(isDevelopment) {
            console.log(`Running ${command} on ${executionPath}`)
        }

        await CommandExecutor.fixShellPathOnMacOs()

        return new Promise((resolve, reject) => {
            try {
                exec(command, {
                    cwd: path.join("", executionPath),
                }, (error: ExecException, stdout: string, stderr: string) => {
                    if(stdout.includes("VEMTO_ERROR_START")) {
                        console.error("(vemto error) FAILED to execute command: " + command)
                        console.error(stderr)
    
                        let errorMessage = this.parseErrorData(stdout),
                            errorStack = this.parseErrorStack(stdout)
    
                        console.log(errorStack)

                        if(errorMessage === 'Unknown Error') {
                            errorMessage = `${stdout} | ${stderr}`
                        }
    
                        let error = {
                            error: errorMessage,
                            message: errorMessage,
                            stack: errorStack
                        }
    
                        reject(error)
                    }
    
                    if(stdout.includes("Warning:")) {
                        console.error("(stderr) WARNING when executing command: " + command)
                        console.error(stdout)
                    }
    
                    if (error && error.code !== 0) { 
                        let errorMessage = "(error) FAILED to execute command: " + command

                        if(stdout) errorMessage += "\n    |> " + stdout
                        if(stderr) errorMessage += "\n    |> " + stderr
    
                        console.error(errorMessage)
                        console.log(stdout)
                        console.error(error.message)
    
                        let errorData = {
                            message: errorMessage,
                            error: errorMessage,
                            stack: error.stack
                        }
    
                        reject(errorData)
                    }
                
                    if (plainReturn) {
                        resolve(stdout)
                    }
    
                    resolve(this.parseJsonData(stdout))
                })
            } catch (error) {
                console.error("(execution error) FAILED to execute command: " + command)
                console.error(error)
                reject(error)
            }
        })
    }

    static async fixShellPathOnMacOs(): Promise<void> {
        if (process.platform !== "darwin") return

        let shellPath

        try {
            shellPath = (await import("shell-path")).shellPathSync()
        } catch (error) {
            shellPath = null
            console.error("Failed to import shell-path", error)
        }

        process.env.PATH = shellPath || [
            "./node_modules/.bin",
            "/.nodebrew/current/bin",
            "/usr/local/bin",
            "/usr/bin",
            "/bin",
            "/usr/sbin",
            "/sbin",
            process.env.PATH
        ].join(":")
    }

    static escapePath(givenPath) {
        const version = os.release()

        console.log('SO version', version)

        // For some windows version (Windows 10 v1803), it is not useful to escape spaces in path
        // https://docs.microsoft.com/en-us/windows/release-information/
        const windowsVersionRegex = /(\d+\.\d+)\.(\d+)/
        const should_not_escape = (majorRelease = '', osBuild = '') =>
            /1\d+\.\d+/.test(majorRelease) && Number(osBuild) >= 17134.1184

        return (CommandExecutor.isPosix())
            // for posix path, escape is simple
            ? givenPath.replace(/(\s+)/g, '\\$1')
            // for windows, it depend of the build
            : (should_not_escape(...windowsVersionRegex.exec(version).splice(1)))
                // on major version, no need to escape anymore
                // https://support.microsoft.com/en-us/help/4467268/url-encoded-unc-paths-not-url-decoded-in-windows-10-version-1803-later
                ? givenPath
                // on older version, replace space with symbol %20
                : givenPath.replace(/(\s+)/g, '%20')
    }

    static isPosix() {
        return (os.platform() !== 'win32')
    }

    static parseJsonData(data: string): any {
        const matches = data.match(/VEMTO_JSON_RESPONSE_START\((.*)\)VEMTO_JSON_RESPONSE_END/)
        
        if (matches && matches[1]) {
            const response = JSON.parse(matches[1])

            if(response.IS_FILE_RESPONSE) {
                console.log('Reading response from file', response.path)

                if(!FileSystem.fileExists(response.path)) {
                    throw new Error(`Response File ${response.path} does not exist`)
                }

                const content = FileSystem.readFile(response.path)
                FileSystem.deleteFile(response.path)

                return JSON.parse(content)
            }


            return response
        }

        return {}
    }

    static parseErrorData(data: string): any {
        const matches = data.match(/VEMTO_ERROR_START\((.*)\)VEMTO_ERROR_END/)
        
        if (matches && matches[1]) {
            return matches[1]
        }

        return 'Unknown Error'
    }


    static parseErrorStack(data: string): any {
        // modify above to support multiple lines
        const matches = data.match(/VEMTO_ERROR_TRACE_START\(([\s\S]*)\)VEMTO_ERROR_TRACE_END/)
        
        if (matches && matches[1]) {
            return matches[1]
        }

        return 'Unknown Error Stack'
    }
}