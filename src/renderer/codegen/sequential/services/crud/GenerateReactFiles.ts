import Crud from "@Common/models/crud/Crud"
import ReactIndexPageRenderable from "@Renderer/codegen/sequential/services/crud/react/pages/ReactIndexPageRenderable"
import ReactCreatePageRenderable from "@Renderer/codegen/sequential/services/crud/react/pages/ReactCreatePageRenderable"
import ReactEditPageRenderable from "@Renderer/codegen/sequential/services/crud/react/pages/ReactEditPageRenderable"
import ReactSowPageRenderable from "@Renderer/codegen/sequential/services/crud/react/pages/ReactSowPageRenderable"
import ReactFormRenderable from "@Renderer/codegen/sequential/services/crud/react/pages/form/ReactFormRenderable"
import ReactTableRenderable from "@Renderer/codegen/sequential/services/crud/react/pages/tables/ReactTableRenderable"
import ReactRouteWebRenderable from "@Renderer/codegen/sequential/services/crud/react/routes/ReactRouteWebRenderable"
import ReactRouteAppRenderable from "@Renderer/codegen/sequential/services/crud/react/routes/ReactRouteAppRenderable"
import ReactEntityRenderable from "@Renderer/codegen/sequential/services/crud/react/pages/entities/ReactEntityRenderable"
import ReactControllerRenderable from "@Renderer/codegen/sequential/services/crud/react/controllers/ReactControllerRenderable"
import ReactHeadingAppRenderable from "@Renderer/codegen/sequential/services/crud/react/components/ReactHeadingAppRenderable"
import ReactPaginationListingRenderable from "@Renderer/codegen/sequential/services/crud/react/types/ReactPaginationListingRenderable"
import ReactCustomPaginationRenderable from "@Renderer/codegen/sequential/services/crud/react/components/ReactCustomPaginationRenderable"
import ReactDeleteModalRenderable from "@Renderer/codegen/sequential/services/crud/react/components/ReactDeleteModalRenderable"
import ReactActionIconsRenderable from "@Renderer/codegen/sequential/services/crud/react/components/ReactActionIconsRenderable"
import ReactUsePermissionRenderable from "@Renderer/codegen/sequential/services/crud/react/hooks/ReactUsePermissionRenderable"
import ApiStoreRequestRenderable from "@Renderer/codegen/sequential/services/crud/api/ApiStoreRequestRenderable"
import ApiUpdateRequestRenderable from "@Renderer/codegen/sequential/services/crud/api/ApiUpdateRequestRenderable"

export default class GenerateReactFiles {
    async start() {
        const cruds: Crud[] = Crud.getBasic()

        for (const crud of cruds) {
            await new ReactControllerRenderable(crud).render()
            await new ReactEntityRenderable(crud).render()
            await new ReactHeadingAppRenderable(crud).render()
            await new ReactIndexPageRenderable(crud).render()
            await new ReactCreatePageRenderable(crud).render()
            await new ReactEditPageRenderable(crud).render()
            await new ReactSowPageRenderable(crud).render()
            await new ReactFormRenderable(crud).render()
            await new ReactTableRenderable(crud).render()
            await new ReactPaginationListingRenderable(crud).render()
            await new ReactCustomPaginationRenderable(crud).render()
            await new ReactDeleteModalRenderable(crud).render()
            await new ReactActionIconsRenderable(crud).render()
            await new ReactUsePermissionRenderable(crud).render()
            await new ReactRouteWebRenderable(cruds).render()
            await new ReactRouteAppRenderable(crud).render()

            await new ApiStoreRequestRenderable(crud).render()
            await new ApiUpdateRequestRenderable(crud).render()
        }
    }
}
