from typing import List
from src.template_manager.template_data import (
    ResourceTemplateData,
    EdgeTemplateData,
    get_edge_templates_data_for_owner,
    get_klotho_supported_edge_template_data,
    get_klotho_supported_resource_template_data,
    get_resource_templates_data_for_owner,
)


async def get_owner_templates(
    owner_id: str,
) -> List[ResourceTemplateData or EdgeTemplateData]:
    klotho_resource_templates = await get_klotho_supported_resource_template_data()
    klotho_edge_templates = await get_klotho_supported_edge_template_data()
    owner_resource_templates = await get_resource_templates_data_for_owner(owner_id)
    owner_edge_templates = await get_edge_templates_data_for_owner(owner_id)

    templates = []
    add_latest_version_of_templates(owner_edge_templates, templates)
    add_latest_version_of_templates(owner_resource_templates, templates)
    add_latest_version_of_templates(klotho_edge_templates, templates)
    add_latest_version_of_templates(klotho_resource_templates, templates)
    return templates


def add_latest_version_of_templates(
    templates: List[ResourceTemplateData or EdgeTemplateData],
    latest_templates: List[ResourceTemplateData or EdgeTemplateData],
):
    for template in templates:
        duplicate = False
        for curr_template in latest_templates:
            if isinstance(template, EdgeTemplateData) and isinstance(
                curr_template, EdgeTemplateData
            ):
                if (
                    template.source == curr_template.source
                    and template.destination == curr_template.destination
                ):
                    if (
                        template.version > curr_template.version
                        and template.owner == curr_template.owner
                    ):
                        latest_templates.remove(curr_template)
                    else:
                        duplicate = True
            elif isinstance(template, ResourceTemplateData) and isinstance(
                curr_template, ResourceTemplateData
            ):
                if template.resource == curr_template.resource:
                    if (
                        template.version > curr_template.version
                        and template.owner == curr_template.owner
                    ):
                        latest_templates.remove(curr_template)
                    else:
                        duplicate = True
        if not duplicate:
            latest_templates.append(template)
    return latest_templates
