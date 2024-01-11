import { Button, Label, Modal, TextInput } from "flowbite-react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import { UIError } from "../../shared/errors";
import { AiOutlineLoading } from "react-icons/ai";
import useApplicationStore from "../../pages/store/ApplicationStore";
import type { Property, ResourceType } from "../../shared/resources/ResourceTypes";
import { ConfigGroup } from "../config/ConfigGroup";
import { ResourceTypeDropdown } from "./ResourceTypeDropdown";
import { ApplicationConstraint, ConstraintOperator, ResourceConstraint } from "../../shared/architecture/Constraints";
import { NodeId } from "../../shared/architecture/TopologyNode";

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
    selectedResource,
    resourceTypeKB,
    environmentVersion,
  } = useApplicationStore();

  const [fields, setFields] = useState<Property[]>([]);
  const resourceType: ResourceType = methods.watch("ResourceType");

  useEffect(() => {
    if (resourceType) {
      const importFields = resourceTypeKB?.getImportFieldsForResourceType(
        resourceType.provider,
        resourceType.type,
      ) ?? []
      setFields(
        importFields.map((field) => { 
          return { ...field, configurationDisabled: false }
        })
      );
    }
  }, [resourceType, resourceTypeKB]);

  const formstate = methods.formState;
  const errors = formstate.errors

  const [isSubmitting, setIsSubmitting] = useState(false);

  let onSubmit: SubmitHandler<any> = useCallback(
    async (state: any) => {
      let id;
      let success = false;
      setIsSubmitting(true);
      const resourceConstraints: ResourceConstraint[] = []
      Object.keys(state).forEach((key) => {
        const val = key.split("#", 2)
        if (val.length != 2) {
            return
        }
        const propertyKey = val[1]
        if (key != "name" && key != "ResourceType") {
          resourceConstraints.push(new ResourceConstraint(
            ConstraintOperator.Equals,
            new NodeId(state["ResourceType"].type, "", state["name"], state["ResourceType"].provider),
            propertyKey,
            state[key]
          ))
        }
      })
      try {
        const errors = applyConstraints([
          new ApplicationConstraint(
            ConstraintOperator.Import,
            new NodeId(state["ResourceType"].type, "", state["name"], state["ResourceType"].provider),
          ),
          ...resourceConstraints
        ]);
        success = true;
      } catch (e: any) {
        console.log(e)
        addError(
          new UIError({
            errorId: "NewArchitectureModal:Submit",
            message: "Failed to create architecture!",
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
                errorId: "NewArchitectureModal:Submit",
                message: "Loading new architecture failed!",
                cause: e,
              }),
            );
          }
        }
      }
    },
    [addError, getIdToken, onClose, methods.reset, resetEditorState, user?.sub],
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
  }, [onClose, methods.reset]);


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
          <Modal.Header>Import Resource</Modal.Header>
          <Modal.Body>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="Resource Type" value="Resource Type" />
              </div>
              <ResourceTypeDropdown
              onResourceSelection={(rt) => methods.setValue("ResourceType", rt, {
                shouldTouch: true,
                shouldDirty: true,
                shouldValidate: true,
              })}
              selectedValue={resourceType}
              />
              { 
              resourceType && 
              <div className="p-2">
                <hr/>
                <div className="mb-2 block">
                    <Label htmlFor="Name" value="Name" />
                  </div>
                <TextInput
                  placeholder="Name"
                    {...methods.register("name", {
                      required: "Name is required",
                      minLength: {
                        value: 1,
                        message: "Name must be at least 1 character long",
                      },
                      onChange: async () => {
                        await methods.trigger("name");
                      },
                    })}
                />
                <ConfigGroup fields={fields} configResource={new NodeId(resourceType.type, "", "", resourceType.provider)} filter={(field: Property, resourceID?: NodeId) => false}/>
              </div>


                }
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="submit"
              color="purple"
              disabled={Object.entries(errors).length > 0 || resourceType === undefined}
              isProcessing={isSubmitting}
              processingSpinner={<AiOutlineLoading className="animate-spin" />}
            >
              Create
            </Button>
          </Modal.Footer>
        </form>
      </FormProvider>
    </Modal>
  );
}