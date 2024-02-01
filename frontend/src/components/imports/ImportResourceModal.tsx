import { Button, Label, Modal, TextInput } from "flowbite-react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import { UIError } from "../../shared/errors";
import { AiOutlineLoading } from "react-icons/ai";
import useApplicationStore from "../../pages/store/ApplicationStore";
import type {
  Property,
  ResourceType,
} from "../../shared/resources/ResourceTypes";
import { ConfigGroup } from "../config/ConfigGroup";
import { ResourceTypeDropdown } from "./ResourceTypeDropdown";
import {
  ApplicationConstraint,
  ConstraintOperator,
  ResourceConstraint,
} from "../../shared/architecture/Constraints";
import { NodeId } from "../../shared/architecture/TopologyNode";
import { FormFooter } from "../FormFooter";
import classNames from "classnames";

interface NewArchitectureModalProps {
  onClose: () => void;
}

export interface NewArchitectureFormState {
  name: string;
}

export default function ImportResourceModal({
  onClose,
}: NewArchitectureModalProps) {
  const methods = useForm();
  const {
    getIdToken,
    user,
    resetEditorState,
    addError,
    applyConstraints,
    resourceTypeKB,
  } = useApplicationStore();

  const [fields, setFields] = useState<Property[]>([]);
  const resourceType: ResourceType = methods.watch("ResourceType");

  useEffect(() => {
    if (resourceType) {
      const importFields =
        resourceTypeKB?.getImportFieldsForResourceType(
          resourceType.provider,
          resourceType.type,
        ) ?? [];
      setFields(
        importFields.map((field) => {
          return { ...field, configurationDisabled: false };
        }),
      );
    }
  }, [resourceType, resourceTypeKB]);

  const formstate = methods.formState;
  const errors = formstate.errors;

  const [isSubmitting, setIsSubmitting] = useState(false);

  let onSubmit: SubmitHandler<any> = useCallback(
    async (state: any) => {
      let id;
      let success = false;
      setIsSubmitting(true);
      const resourceConstraints: ResourceConstraint[] = [];
      Object.keys(state).forEach((key) => {
        const val = key.split("#", 2);
        if (val.length != 2) {
          return;
        }
        const propertyKey = val[1];
        if (key != "name" && key != "ResourceType") {
          resourceConstraints.push(
            new ResourceConstraint(
              ConstraintOperator.Equals,
              new NodeId(
                state["ResourceType"].type,
                "",
                state["name"],
                state["ResourceType"].provider,
              ),
              propertyKey,
              state[key],
            ),
          );
        }
      });
      try {
        const errors = applyConstraints([
          new ApplicationConstraint(
            ConstraintOperator.Import,
            new NodeId(
              state["ResourceType"].type,
              "",
              state["name"],
              state["ResourceType"].provider,
            ),
          ),
          ...resourceConstraints,
        ]);
        success = true;
      } catch (e: any) {
        console.log(e);
        addError(
          new UIError({
            errorId: "ImportResourceModal:Submit",
            message: "Failed to import resource!",
            cause: e as Error,
          }),
        );
      }
      setIsSubmitting(false);
      if (success) {
        onClose();
        methods.reset();
        if (id) {
          try {
            resetEditorState();
          } catch (e: any) {
            addError(
              new UIError({
                errorId: "ResedEditorState:Submit",
                message: "Failed to update editor!",
                cause: e,
              }),
            );
          }
        }
      }
    },
    [applyConstraints, addError, onClose, methods, resetEditorState],
  );

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        methods.reset();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose, methods]);

  return (
    <Modal
      show={true}
      onClose={() => {
        methods.reset();
        onClose?.();
      }}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Modal.Header>Import a resource</Modal.Header>
          <Modal.Body className="divide-y divide-gray-300 dark:divide-gray-600">
            <div>
              <p className="text-gray-700 dark:text-gray-200">
                Select the resource type you want to import and fill in the
                required fields.
              </p>
              <p className="py-1 text-sm text-gray-700 dark:text-gray-200">
                Imported resources can be used in your architecture, but are
                configured externally.
              </p>
              <div className="mb-4 mt-8 flex flex-col gap-1">
                <Label htmlFor="Resource Type" value="Resource Type" />
                <ResourceTypeDropdown
                  onResourceSelection={(rt) =>
                    methods.setValue("ResourceType", rt, {
                      shouldTouch: true,
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  selectedValue={resourceType}
                />
              </div>
            </div>
            {resourceType && (
              <div className="flex flex-col justify-center gap-2 pt-4">
                <div className="flex flex-col gap-1 p-1">
                  <Label
                    className={classNames({
                      "text-red-600 dark:text-red-500": errors["name"],
                    })}
                    htmlFor="Name"
                    value="Name"
                  />
                  <TextInput
                    placeholder="Name"
                    sizing="sm"
                    type="text"
                    color={errors["name"] ? "failure" : "gray"}
                    helperText={
                      errors["name"] && (
                        <span>{errors["name"].message?.toString()}</span>
                      )
                    }
                    {...methods.register("name", {
                      required: "Name is required",
                      pattern: {
                        value: /^[a-zA-Z0-9_./\-:\[\]]*$/,
                        message:
                          "Name must only contain alphanumeric characters, dashes, underscores, dots, and slashes",
                      },
                      minLength: {
                        value: 1,
                        message: "Name must be at least 1 character long",
                      },
                      onChange: async () => {
                        await methods.trigger("name");
                      },
                    })}
                  />
                </div>
                <ConfigGroup
                  fields={fields}
                  configResource={
                    new NodeId(resourceType.type, "", "", resourceType.provider)
                  }
                  filter={(field: Property, resourceID?: NodeId) => false}
                />
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <FormFooter>
              <Button
                type="submit"
                color="purple"
                disabled={
                  Object.entries(errors).length > 0 ||
                  resourceType === undefined
                }
                isProcessing={isSubmitting}
                processingSpinner={
                  <AiOutlineLoading className="animate-spin" />
                }
              >
                {isSubmitting ? "Importing" : "Import"}
              </Button>
            </FormFooter>
          </Modal.Footer>
        </form>
      </FormProvider>
    </Modal>
  );
}
