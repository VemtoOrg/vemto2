# Vemto - Architectural Documentation

Vemto is a code generation software aimed at the Laravel framework. In this document, we will specify some of the principles of its architecture, aiming to facilitate development.

This documentations is being adapted from the original/internal Vemto's development documentation, but with adaptations to the new OSS reality.

By Tiago Rodrigues

## Table of Contents

- [Vemto - Architectural Documentation](#vemto---architectural-documentation)
  - [Table of Contents](#table-of-contents)
- [Development Tips and Rules](#development-tips-and-rules)
- [About Using TypeScript](#about-using-typescript)
- [The Vemto's architecture](#the-vemtos-architecture)
  - [Execution Cycle Overview](#execution-cycle-overview)
    - [Detailed Explanation of the Execution Cycle](#detailed-explanation-of-the-execution-cycle)
- [Code Structure](#code-structure)
- [.vemto folder](#vemto-folder)
- [Model Structure](#model-structure)
  - [Other Models](#other-models)
- [Schema reading](#schema-reading)
- [Code Generation](#code-generation)
- [Testing templates](#testing-templates)

# Development Tips and Rules

- We always keep the code clean and as simple as possible. We follow the philosophy **KISS (Keep It Simple, Stupid)** - Therefore, we always look for simple solutions, especially as we are a small company. Simple is not always the easiest to implement, but it is often the easiest to understand and maintain.
- We ask whenever necessary. The ideal is to always exchange information.
- We write tests whenever possible.
- We use double quotes “” for strings in Vemto, instead of single quotes, by convention and to keep everything standardized. In case of concatenation, we use `${var} ${var2}`
- Whenever we compare two code files, we use the service common/services/CodeComparer.ts - this avoids having problems with “virtually” identical code files, but which are considered different because they were saved in different operating systems (usually due to problems with line breaks or BOM characters, etc.)
- Whenever data needs to be compared within a SchemaModel to check for updates in the Laravel application code, we use the service **DataComparator** to avoid problems with false positives. Elsewhere, we use standard language comparison tools
- We always start a new branch from the branch develop for the development of a feature or a fix. We follow the **git-flow** development standard
- We have a plugin for VSCode that allows you to view the syntax of .vemtl files: https://github.com/VemtoOrg/vemto-template-engine-syntax-vscode

# About Using TypeScript

When I started developing Vemto 2, I didn't have much knowledge of TypeScript, and I just wanted an alternative to JSDoc for code completion.

Because of this, despite using TypeScript, there's still room for improvement; many things still lack specific types, etc.

I believe that if I were to start over today, I would do several things differently. But this is what we have at the moment.

# The Vemto's architecture

Vemto's architecture revolves around a comprehensive execution cycle that handles the entire process from connecting to a Laravel application, reading its schema, managing data through RelaDB models, and generating code with user confirmation and conflict resolution.

## Execution Cycle Overview

The following flowchart illustrates the main execution cycle of Vemto:

```mermaid
---
config:
  theme: base
  layout: dagre
  look: neo
---
flowchart TD
    A[User connects to Laravel project] --> B[Create .vemto folder if needed]
    B --> C[Run db-reader PHP app to read schema]
    C --> D[Parse JSON response from db-reader]
    D --> E[Save data to RelaDB models
Tables, Columns, Indexes, etc.]
    E --> F[Schema synchronized in Vemto UI]
    
    F --> G{User makes schema changes
in Vemto?}
    G -->|Yes| H[Modify RelaDB models
e.g. add table, change column]
    H --> I[Models marked as dirty]
    I --> J[User initiates code generation
for migrations/models]
    
    G -->|No| K[User initiates general code generation
F5 or Generate Code]
    
    J --> L[Generate migrations and models
using MigrationEditor, GenerateNewMigration, etc.]
    L --> M[Present migrations/models for user review
and confirmation]
    M --> N{User confirms?}
    N -->|Yes| O[Write migrations and models to disk]
    N -->|No| P[Cancel or modify changes]
    
    K --> Q[SequentialGenerator processes all renderables]
    Q --> R[Create Renderable objects
e.g. RenderableFactory, RenderableController]
    R --> S[Render templates using .vemtl files
and Vemto Template Engine]
    S --> T[Generate RenderableFile objects
with rendered content]
    T --> U[Add to Code Queue]
    
    O --> V[Check for conflicts
file modified by user?]
    U --> V
    V --> W{Conflicts detected?}
    W -->|Yes| X[Present conflict resolution options
AI or manual merge]
    X --> Y{Resolved?}
    Y -->|Yes| Z[Write files to disk]
    Y -->|No| AA[Skip or ignore file]
    
    W -->|No| Z
    Z --> BB[Update schema state if needed
after code generation]
    BB --> CC[Execution cycle complete]
    
    P --> F
    AA --> CC
```

### Detailed Explanation of the Execution Cycle

1. **Project Connection and Initial Schema Reading**:
   - When a user connects Vemto to a Laravel project, the system first checks for an existing `.vemto` folder. If it doesn't exist, one is created based on the `main/static/vemto-folder-base` template.
   - Vemto then executes the `db-reader` PHP application (compiled as VMTTL1) to read the Laravel application's database schema. This app runs migrations directly on a temporary database to extract the current schema structure.
   - The `db-reader` returns a JSON response encapsulated in `VEMTO_RESPONSE_START(...)VEMTO_RESPONSE_END` markers to avoid terminal output issues.
   - Services like `SchemaBuilder.ts`, `TablesBuilder.ts`, and `ModelsBuilder.ts` parse this JSON and populate the RelaDB models (Table, Column, Index, Model, Relationship) with the schema data.

2. **Data Persistence with RelaDB**:
   - All schema information is stored in the `.vemto/data.json` file using RelaDB, a proprietary ORM similar to Eloquent.
   - SchemaModel instances (Table, Column, etc.) maintain both current Vemto state and `schemaState` (the original Laravel application state) to track changes.
   - Models are saved synchronously, allowing Vemto to detect "dirty" states when modifications are made.

3. **Schema Modifications and Change Detection**:
   - Users can modify the schema through Vemto's UI (e.g., rename tables, add columns).
   - When changes occur, the `isDirty()` method returns `true`, indicating that migrations need to be generated.
   - The `DataComparator` service ensures accurate change detection by comparing model states.

4. **Code Generation for Migrations and Models**:
   - For schema changes, Vemto uses services like `MigrationEditor.ts`, `GenerateNewMigration.ts`, `GenerateTableChangerMigration.ts`, and `UpdateExistingMigration.ts`.
   - Generated migrations and models are presented to the user for review and confirmation before being written to disk.
   - This manual review prevents automatic overwriting and ensures migrations are generated in a natural, developer-friendly manner.

5. **General Code Generation Process**:
   - For other code generation (controllers, views, factories, etc.), the `SequentialGenerator.ts` orchestrates the process.
   - Renderable classes (e.g., `RenderableFactory`) define how each file type should be generated, specifying template files, data, and output paths.
   - Templates (`.vemtl` files) are processed by the Vemto Template Engine, which supports JavaScript logic for dynamic code generation.

6. **Code Queue and Conflict Resolution**:
   - Rendered content becomes `RenderableFile` objects added to the Code Queue, visible in Vemto's UI.
   - Before writing files, Vemto checks for conflicts using `CodeComparer.ts` to detect user modifications.
   - Conflicts can be resolved manually or with AI assistance. Files have various states (IDLE, CONFLICT, IGNORED, etc.) to manage the generation process.

7. **Post-Generation Synchronization**:
   - After code generation, the schema may be re-synchronized to reflect any changes made during the process.
   - This ensures Vemto's internal state remains accurate and up-to-date.

This execution cycle provides a robust, user-controlled environment for Laravel code generation, balancing automation with manual oversight to prevent unintended changes and maintain code quality.

# Code Structure

![img](/docs/img/01.png)

Vemto is divided into 4 main code structures:

- **main** - where all the code that runs in the main Electron process is located (basically, the code that runs in the background). Communication with this area of ​​the application is done via preload.ts (which generally maps to commands in IpcMessagesHandler.ts). In the renderer (FrontEnd of the application), the preload methods are accessible from the electron.d.ts file through the ElectronApi interface). They are used via the Main.API ​​singleton in the renderer. Main is compiled as ES5 due to the version of Electron used (20.x), which does not yet support ES6 in this part of the application. Main contains the application's lowest-level logic, such as reading and writing files, executing commands, etc.
- **common** - here is all the code common to the renderer and main (mainly the application Models, which use the RelaDB database and its ORM, a proprietary database created specifically for Vemto
- **renderer** - the front end of the application. However, the renderer not only has the VueJS visualization layer, but also **most of the code generation logic**. Basically, all logic that is not very close to the Operating System (for example, writing files or accessing the database) is in the renderer, and is built using the logic made available in main through preload. In other words, in Vemto, main is lean and only takes care of very specific, low-level logic. High-level logic is always in the renderer (or in some cases, in common when it needs to be shared)
- **php** - this area contains all the PHP apps that are run by Vemto through the Terminal. For example, when Vemto needs to read the data structure of a Laravel application, it runs the PHP **db-reader app** (or the older/deprecated schema-reader). This app returns data in a JSON format (which is encapsulated within a string **VEMTO_RESPONSE_START( )VEMTO_RESPONSE_END** to avoid problems with unwanted characters generated by the Operating System terminal (most recent Vemto versions write the response to a file instead of using stdout). We can create specific apps for various tasks such as reading migrations, reading the database, reading the .env, reading the logs, and so on. When compiled, apps usually have a name like VMTTL1, VMTTL2, etc. (configured in the file). php/compiler.json). This was to avoid reverse engineering attempts by curious people when Vemto was a commercial project (just a way to shorten it). But basically, the VMTTL1 file is the db-reader.phar renamed after it is compiled with the PHP Box library. A PHP app may or may not contain composer packages, and can also use the Laravel application's own composer packages if necessary.

**IMPORTANT:** generally, everything that is done in main is asynchronous. So most of Vemto's code for reading/writing data, and also for code generation is asynchronous. Consequently, we use async/await a lot in the renderer logic. That said, whenever models are read or saved, it is done synchronously.

Therefore, the following is considered when working with models:

```ts
// Await in these cases is unnecessary, as 
// the models work synchronously
await table.save()
await table.delete()
await Model.find(1)

// The correct thing to do in these situations is:
table.save()
table.delete()
Model.find(1)
```

# .vemto folder

![img](/docs/img/02.png)

When Vemto connects to a Laravel application, a .vemto folder is generated (created based on *the main/static/vemto-folder-base* folder). 

This folder contains all the files necessary for the Vemto project, from the database file (data.json), to the generated code (necessary for comparisons and conflict resolutions) and also the templates (both the templates that were copied to the /templates/base folder after creating the project and the templates in the /templates/custom folder that was changed by the user).

If the .vemto folder already exists in a project, Vemto will simply connect it to the project without generating it. If the .vemto folder is deleted, the Vemto project will be lost, and a new connection to the Laravel application will be made from scratch, reading the data from the database again.

# Model Structure

Models are the basis of Vemto's logic. They are very similar to Laravel models, and even the RelaDB ORM is very similar to the Eloquent ORM:

![img](/docs/img/03.png)

It is important to point out that data from a Vemto project is always saved in a Relational way, much like a common SQL database. For example, when you open a project, you are opening record 1 in the projects table. 

When we read the schema or create a new table, we are saving it to the tables table in our database (data.json in the .vemto folder). 

For each table, we have models that represent them. So the Table model represents tables, the Index model represents indexes, etc. Tables have relationships between them, which are specified in the relationships() method of a model:

![img](/docs/img/04.png)

Some models are very special and important. These are the Schema-related models (that is, the models that represent everything you see in Vemto's Schema editor):

![img](/docs/img/05.png)

> You can easily identify these models as they extend the abstract class AbstractSchemaModel and implement the SchemaModel interface. These models are:

```
Table
Column
Index
Model
Relationship
```

SchemaModel models are very important in Vemto as they are responsible for accurately representing the “Schema State” of the Laravel application. 

In other words, if a Laravel application has the “users” table with the “name” column, Vemto needs to have a table record called “users”, with a column called “name”. These records are represented by their respective models.

![img](/docs/img/06.png)

But as we can make modifications in Vemto, a model of type SchemaModel always needs to save both the Laravel application data version and the current version modified by Vemto (this allows us to know when Vemto contains changes that need to be saved in code, for example, generating migrations or models).

Therefore, every model of the SchemaModel type has a schemaState: any property that stores the state of the information read directly from the application, at the same time that the class properties store the information according to its version of Vemto.

For example, suppose we have a table in the application called “users”. Therefore, if in Vemto we do:

```ts
const table = Table.find(1)

console.log(table.name) // Will return "users"

console.log(table.schemaState.name) // Will return "users"

console.log(table.isDirty()) // Will return "false", there are no modifications
```

However, if we change the table name in Vemto:

```ts
table.name = "users_renamed"
table.save() // Need to call save() to persist in the database

console.log(table.name) // Will return "users_renamed"

console.log(table.schemaState.name) // Will return "users"

console.log(table.isDirty()) // Will return "true", there are modifications
```

In other words, now Vemto knows that there are changes to the table, and therefore the **table.isDirty()** method returns “true”, and Vemto will know that it needs to show the option to save the migrations.

> **IMPORTANT:** It is important to note that **NEVER**, under any circumstances, we manipulate the property schemaState of a SchemaModel. Only schema reading services (**SchemaBuilder.ts, TablesBuilder.ts and ModelsBuilder.ts**) can do this, as *schemaState* must always reflect the state of the application code. This also means that **we never call the method applyChanges() from a SchemaModel outside of these services**; For security reasons, Vemto only allows the State schema to be modified if a model's **savingInternally** mode is enabled, as seen below:

![img](/docs/img/07.png)

> Because the applyChanges() method of a SchemaModel always modifies the schemaState, as seen in the image below:

![img](/docs/img/08.png)

**IMPORTANT**: For these types of models, the **buildSchemaState() and dataComparisonMap() methods are extremely important**, and care must be taken when modifying these methods, as they are responsible for checking whether there are changes between the application's Schema and the current Vemto Schema.

![img](/docs/img/09.png)

**In general, it is not necessary to modify these methods**, as Vemto has been able to read almost perfectly the data necessary to assemble the Schema for years (so we will very rarely change these parts of SchemaModel models).

## Other Models

That said, the other models are generally not synchronized with the application code, existing only in Vemto and serving only for data representation and subsequent code generation. For example, the **Crud** and **Input** models are used to represent an application of type Crud:

![img](/docs/img/10.png)

When generating the code, the data from these models will be used. However, if there are manual changes to the CRUD code, Vemto will not update them internally (since it is not well-defined data like Schema, and therefore the complexity of such a task is much greater). 

> Vemto will only check if there is a possibility to resolve code conflicts using AI or manually after the generation task.

# Schema reading

Vemto generally reads Schema data at the following times:

- The first time the application is connected (*ProjectConnector.ts -> doFirstSchemaSync()*)
- Whenever a migration or model is saved from the *Schema Editor* (in this case, the schemaState of all models is overwritten with the reading information)
- Whenever any type of code is generated by Vemto (by clicking on the “Generate Code” or typing F5) - In this case, only the models are synchronized (it is possible that the code generation process modifies some sections of the models, and therefore they need to be synchronized after generation)
- Whenever there are manual changes in the code (in this case, Vemto just reads the data, but if there are changes, it will show an alert message, and will not overwrite the data without user permission)
- Whenever the user explicitly uses the options “Synchronize Schema” or “Check for Changes” on the Schema editor

> Schema reading and synchronization are done by services **SchemaBuilder.ts, TablesBuilder.ts and ModelsBuilder.ts**. 

**IMPORTANT** - These services are critical components of Vemto. We will rarely need to work on them, but if necessary, **always be sure to write a test to ensure everything is ok**.

There are two ways for Vemto to read the application schema:

- **Migrations Reader (deprecated)** - Through the PHP schema-reader app, Vemto reads the migrations in the application folder, executes them using a Fake method (which does not generate a database), and generates a database structure in RAM, which is then translated to a JSON file. This mode is the oldest, was created only as a prototype, and does not have a good code structure. Despite this, it works for small Laravel apps and is very fast, which is why it has been maintained in Vemto. **IMPORTANT:** This reading mode does not support SQL commands in migrations (only standard Laravel Schema Builder commands).
- **Database Reader** - Executed by the PHP **db-reader** app, this mode was created later so that Vemto can read any type of migration. Instead of trying to interpret the migrations, the app simply runs them directly in the DBMS, creating an empty database, which is then used to read the Schema structure. Although it works much better than Migrations Reader and supports almost any database scenario, this option is slightly slower (in the case of MySQL, MySQL 8 is recommended, which runs much faster in these cases). 
   
# Code Generation
Vemto generally generates code in two moments:

- When there are changes to the Schema, the user is taken to a screen where they can review the models and migrations and, once everything is confirmed, the code is saved by Vemto.
- Or when the user clicks on “Generate Code” or key F5 - in this case, Vemto generates all the code available to be generated (except migrations and models, which require manual review). Generally, views, controllers, factories, seeders, livewire components, etc. are generated here. Everything will depend on how the project is configured and what data is available.

**IMPORTANT:** Vemto 2, unlike the previous version, requires explicit authorization from the user to generate migrations. This occurs because, if you choose to generate migrations every time you generate the code, you will have to overwrite the existing migrations or use some practice that means that the migrations are not generated in the most natural way possible (as if they had been written by the developer himself). 

Furthermore, if migrations are generated with problems, this will cause Schema reading failures. Therefore, we chose to manually review migrations and models in Vemto 2.

In the case of step one (generation of migrations and models), the services responsible are generally:

```ts
MigrationEditor.ts
GenerateNewMigration.ts
GenerateTableChangerMigration.ts
UpdateExistingMigration.ts
```

In step 2, the main service is the **SequentialGenerator.ts**, a service responsible for calling all other services that generate some type of code in the sequence. Generally, for each code file that will be generated, we first create a **Renderable**. A Renderable is a special class that defines how and with what data a template will be rendered (we call it rendering when we transform a template into code). 

A simple example is the renderable that renders a Factory:

```ts
export default class RenderableFactory extends Renderable {
    model: Model
    
    constructor(model: Model) {
        super()

        this.model = model
    }

    canRender():boolean {
        return true
    }

    getType(): RenderableFileType {
        return RenderableFileType.PHP
    }

    getTemplateFile(): string {
        return "database/Factory.vemtl"
    }

    getPath(): string {
        return "database/factories"
    }

    getFilename(): string {
        return `${this.model.name}Factory.php`
    }

    hooks() {
        return this.model.getHooks('factory')
    }

    getFormatter(): RenderableFileFormatter {
        return RenderableFileFormatter.PHP
    }

    getData() {
        return {
            model: this.model,
        }
    }
}
```

The two most important methods of a Renderable are:
- **getTemplateFile()** - Defines which template file should be used to render the code
- **getData()** - Defines which data will be sent to the template

A template is a **.vemtl** format file, compiled by the [Vemto Template Engine](https://github.com/VemtoOrg/vemto-template-engine) ([more info here](https://vemto.app/docs/1.x/vet)). 

Vemto will first check whether the template was customized by the user (folder *.vemto/templates/custom*). Otherwise, it will look for the template in (*.vemto/templates/base*). If it doesn't find it, it will use the internal template inside (*main/static/templates*). 

> The *.vemto/templates/base* folder is created whenever it does not exist in the project. It is used so that, if the template is modified in future versions of Vemto, the project continues to work with the version of the template from the time it was created. Furthermore, it is possible to compare if there are differences and alert the user to update the template to the latest version.

Basically, it is a type of file that allows the use of JavaScript logic within special tags to control the code generation flow. Following the Renderable Factory example above, we have the following template (only a part as it is an extensive file):

```js
<?php

<####>
<# TEMPLATE DATA #>
<# DATA:MODEL [ project = Project ] #>
<# DATA:MODEL [ model = Model ] #>
<# DATA:RENDERABLE [ renderable = model/RenderableFactory(model) ] #>
<####>

<# TEMPLATE IMPORTS #>
<% const pascalCase = this.require('pascalCase') %>
<####>
<# TEMPLATE VARIABLES #>
<% const model = this.model %>
<####>

namespace Database\Factories;

use <$ model.class $>;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
// hook:IMPORTS

class <$ this.filenameWithoutExtension $> extends Factory
{
    // hook:TRAITS
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = <$ model.name $>::class;

    // hook:VARIABLES

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // hook:BEFORE_DEFINITION
        return [
            <% for (let column of model.table.getColumns()) { %>
                <% let columnIsKey = column.isPrimaryKey() || column.isForeignKey() %>
                <% let canAddColumn = !column.isDefaultLaravelTimestamp() && !columnIsKey %>
                <# --- #>
                <% if(canAddColumn && column.hasFaker()) { %>
                '<$ column.name $>' => <$ column.getFakerForTemplate() $>,
                <% } %>
            <% } %>
```


As we can see, right at the beginning of the file we have a section **<# TEMPLATE DATA #>**; *.vemtl* templates support data tags using the *DATA:TYPE [ name = value ]* syntax. 

In the case of Vemto, we use this data only to know what type of information should be available when editing templates in the Templates Editor. The data in this section is not used in rendering the template, as they are injected directly into the template via the *Template Engine's setData()* method. 

Also, note that the first item is of type Project. This occurs because internally, Vemto always passes the variable project for the template being rendered. 

In other words, even if we have not specified it in Renderable, all templates receive it implicitly.

```js
<####>
<# TEMPLATE DATA #>
<# DATA:MODEL [ project = Project ] #>
<# DATA:MODEL [ model = Model ] #>
<# DATA:RENDERABLE [ renderable = model/RenderableFactory(model) ] #>
<####>
```

However, all Vemto templates must have the TEMPLATE DATA section so that the data in the Template Editor is set correctly. 

Unlike when the template is being rendered by Vemto, in the Template Editor the data needs to be configured manually (otherwise it would not be possible to render it). 

Therefore, this section is important to guide Vemto on which data to select by default, and to generate the screen where this data can be changed.

![img](/docs/img/11.png)

There are two very important types of data that can appear in the TEMPLATE DATA section settings:

```js
<# DATA:EXPOSE_LOCAL [ exposed_variables = index ] #>
<# DATA:RENDERABLE [ renderable = CustomRenderable() ] #>
```

We will explain each of them here:

**DATA:EXPOSE_LOCAL** - this section is for templates that are imported by other templates. Generally, when importing a template into Vemto, the variables existing within the context in which it was imported are passed directly to that template. For example:

```js
<# Indexes #>
<% for (let index of this.table.getIndexes()) { %>
    <import template="MigrationIndex.vemtl">
<% } %>
```

In this case, the variable index created in for loop will be available within the template MigrationIndex.vemtl when it is rendered, and it works perfectly. However, for our Template editor, there is no way to know this when we open the MigrationIndex.vemtl template, as it is being opened directly, and not opened within another template. 

In this case, we need to inform which data is available for this template directly as variables, outside the this context. Therefore, we use **EXPOSE_LOCAL** to inform it that we want to expose *this.index* as *const index*. This way, the Templates Editor can render the MigrationIndex.vemtl even outside the import context.

**DATA:RENDERABLE** - Here you can inform which Renderable class will be used to render the file. 

If it is a template used only for importing into other templates (such as MigrationIndex.vemtl), i.e. a template rendered directly by Vemto, without the need for a Renderable class (like templates/inputs/blade/BelongsTo.vemtl), we inform the option CustomRenderable() so that the template editor can render it. 

If it is a template that has a Renderable class, we inform this correctly. For example, for the template *Factory.vemtl*, we have the renderable *model/RenderableFactory(model)*



All data passed to the template through Renderable's getData() method is available in the context this of the template. Therefore, for the following data:

```ts
getData() {
    return {
        model: this.model,
    }
}
 ```


We can use it as follows in the template:

```php
<# Uses of this.model that was injected by the template engine #>
<% const model = this.model %>
<% const something = this.model.something() %>
<$ this.model.printSomething() $>
<####>
<# Remembering that this.project is always available #>
<% if(this.project.something()) { %>
```

Therefore, a Renderable object is responsible for reading the template file, initializing the template engine, passing the data and rendering the code.

> When we call the *renderable.render()* method of a Renderable, if we are not in Vemto's dependency checking mode (a mode in which renderables are called, but to check for missing composer or nodejs dependencies in the Laravel project), the template is rendered, and a RenderableFile is recorded (a RenderableFile is content that has been rendered and now needs to be written to disk). The RenderableFile list can be seen in Vemto's Code Queue:

![img](/docs/img/12.png)

Before writing a RenderableFile, Vemto will check for conflicts (e.g. if the file has been modified by the user) and, if any, will be given the option to resolve these conflicts (using AI or manually). 

We also have an AI-free conflict resolution algorithm, but it needs adjustments and is therefore not working at the moment.

A RenderableFile has several possible states (some defined by Vemto, others by user action), which define what will happen to the file the next time code generation starts:

- IDLE - File waiting to render (write)
- PREPARING - Preparing to render
- PENDING - Pending rendering
- RENDERING - Being rendered
- RENDERED - Rendering finished
- ERROR - An error occurred in rendering (usually details are shown on the Code Queue screen)
- CONFLICT - A code conflict has occurred, options are given to resolve the conflict
- ASK_TO_REMOVE - Need to ask if the file can be deleted from the disk
- CAN_REMOVE - The file can be deleted from the disk
- REMOVED - The file has been deleted from the disk (the Renderable File will be deleted in the next code generation)
- IGNORED - The generation of this file was ignored (by Vemto or the user). Vemto will no longer attempt to write this file to disk until the IGNORED state is explicitly modified
- SKIPPED - File generation was skipped for some specific reason, but may occur in the next generation if the problem is resolved

# Testing templates

Vemto provides several tools that allow you to easily test code generation.

There are two important methods in the TestHelper class that help with these tests:

- **TestHelper.readOrCreateOutputFile** - This method is responsible for saving (the first time) and retrieving a file on subsequent reads. This allows you to save the results of a template's rendering for comparison the next time the test is run.

- **TestHelper.filesRelevantContentIsEqual** - Allows you to check if the relevant content of two files is the same. If it's different, a window will open in the browser showing the differences (which makes debugging template rendering issues much easier).

![img](/docs/img/template-test-browser.png)

> If you're absolutely certain that the templates are correct, you can use the **yarn test:replace-outputs** command to overwrite the results of the template tests and make them pass.

Here you can see ann example of a test using them:

```ts
test('It can generate a migration to rename a table column', async () => {
    const table = TestHelper.createTable({ name: 'posts' }),
        column = TestHelper.createColumnWithSchemaState({ name: 'name', table })

    column.name = 'title'
    column.saveFromInterface()

    const migrationGenerator = new GenerateNewMigration(table)

    const renderedTemplateContent = await migrationGenerator.generateUpdaterMigration(),
        renderedTemplateFile = TestHelper.readOrCreateOutputFile('/new-migration-renaming-column.php', renderedTemplateContent)

    const contentIsEqual = TestHelper.filesRelevantContentIsEqual(renderedTemplateFile, renderedTemplateContent)

    expect(contentIsEqual).toBe(true)
})
```