import type { FC } from "react";
import React, { useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import type { User } from "@auth0/auth0-react";
import { Button, Dropdown, Modal, Spinner, TextInput } from "flowbite-react";
import { getEnumKeyByEnumValue } from "../shared/object-util";
import { FaBuildingLock, FaCheck, FaLink, FaUserGroup } from "react-icons/fa6";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { HiChevronDown } from "react-icons/hi2";
import type { UpdateArchitectureAccessRequest } from "../api/UpdateArchitectureAccess";
import { MdOutlineLock } from "react-icons/md";
import { FaGlobeAmericas } from "react-icons/fa";
import type { Architecture } from "../shared/architecture/Architecture";
import useApplicationStore from "../pages/store/ApplicationStore";
import { UIError } from "../shared/errors";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "./FallbackRenderer";
import { trackError } from "../pages/store/ErrorStore";
import { env } from "../shared/environment";
import { AiOutlineLoading } from "react-icons/ai";
import type {
  ArchitectureAccess,
  ArchitectureAccessEntity,
} from "../shared/architecture/Access";
import {
  ArchitectureRole,
  GeneralAccess,
  publicUserId,
} from "../shared/architecture/Access";

interface Entity extends ArchitectureAccessEntity {
  icon: React.ReactElement;
}

const ShareIcon: FC<{
  color?: "green" | "gray" | "purple" | "blue";
  icon: FC<any>;
}> = ({ color, icon }) => {
  const Icon = icon;
  return (
    <div
      className={classNames(
        "flex justify-center items-center rounded-full p-1 h-8 w-8",
        {
          "bg-green-200": color === "green",
          "bg-gray-200": color === "gray",
          "bg-purple-200": color === "purple",
          "bg-blue-200": color === "blue",
          "bg-white text-black": !color,
        },
      )}
    >
      <Icon
        size={18}
        className={classNames({
          "text-green-700": color === "green",
          "text-gray-700": color === "gray",
          "text-purple-700": color === "purple",
          "text-blue-700": color === "blue",
          "text-black": !color,
        })}
      />
    </div>
  );
};

function AddPeopleOrTeamsItem(props: { user: User; entity: Entity }) {
  return (
    <li key={props.entity.id}>
      <div className="flex items-center justify-between gap-5 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-900">
        <div className="flex items-center justify-between gap-5">
          <div className={"max-w-8 h-8 max-h-8 w-8 rounded-full"}>
            {props.entity.icon}
          </div>
          <EntityCard title={props.entity.name} subtitle={props.entity.email} />
        </div>
      </div>
    </li>
  );
}

const AddPeopleOrTeams: FC<{
  user: User;
  entities: Entity[];
  hidden?: boolean;
}> = ({ entities, user, hidden }) => {
  const [search, setSearch] = useState("");
  const [filteredEntities, setFilteredEntities] = useState(entities);
  const [currentRole, setCurrentRole] = useState("editor");

  const handleChange = (e: any) => {
    setSearch(e.target.value);
    setFilteredEntities(
      entities.filter(
        (entity) =>
          entity.name?.toLowerCase().includes(e.target.value.toLowerCase()),
      ),
    );
  };
  if (hidden) {
    return <></>;
  }

  return (
    <div className={"flex flex-col gap-3 p-2"}>
      <div className={"flex gap-3"}>
        <TextInput
          className={"w-full"}
          placeholder={"Add people or teams"}
          value={search}
          onChange={handleChange}
        />
        <Dropdown
          color={"light"}
          placement={"bottom-start"}
          label={getEnumKeyByEnumValue(ArchitectureRole, currentRole)}
        >
          {["editor", "viewer"].map((role: any) => (
            <Dropdown.Item
              key={role}
              name={role}
              value={role}
              onClick={() => setCurrentRole(role)}
            >
              {!!currentRole && (
                <span className="w-8">
                  {role === currentRole && <FaCheck />}
                </span>
              )}
              <span> {getEnumKeyByEnumValue(ArchitectureRole, role)} </span>
            </Dropdown.Item>
          ))}
        </Dropdown>
      </div>

      {search.length > 0 &&
        (filteredEntities.length > 0 ? (
          <ul className="flex flex-col">
            {filteredEntities.map((entity) => (
              <AddPeopleOrTeamsItem
                key={entity.id}
                user={user}
                entity={entity}
              />
            ))}
          </ul>
        ) : (
          <div className={"text-gray-500"}>No results</div>
        ))}
    </div>
  );
};

interface EntityRolesFormState {
  entityRoles: EntityRoleMap;
  generalAccess: {
    type: GeneralAccess;
    role: ArchitectureRole | null;
  };
}

function toEntityRolesFormState(
  access: ArchitectureAccess,
): EntityRolesFormState {
  return {
    entityRoles: Object.assign(
      {},
      ...access.entities
        .filter((e) => e.type !== "organization" && e.id !== publicUserId)
        .map((entity) => ({
          [entity.id]: entity.role,
        })),
    ),
    generalAccess: {
      type: access.generalAccess.type,
      role: access.generalAccess.entity?.role ?? null,
    },
  };
}

interface EntityRoleMap {
  [id: string]: ArchitectureRole | null;
}

function toAccessRequest(
  architectureId: string,
  access: ArchitectureAccess,
  defaultState: Partial<EntityRolesFormState>,
  submittedState: Partial<EntityRolesFormState>,
): UpdateArchitectureAccessRequest {
  const oldEntityRoles = defaultState?.entityRoles ?? ({} as EntityRoleMap);
  const submittedEntityRoles =
    submittedState?.entityRoles ?? ({} as EntityRoleMap);
  const addedEntities = Object.keys(submittedEntityRoles).filter(
    (id) => !oldEntityRoles[id],
  );
  const removedEntities = Object.keys(oldEntityRoles).filter(
    (id) => !submittedEntityRoles[id],
  );
  const updatedEntities = Object.keys(submittedEntityRoles).filter(
    (id) => oldEntityRoles[id] !== submittedEntityRoles[id],
  );

  // update entity roles
  const request: UpdateArchitectureAccessRequest = {
    architectureId,
    entityRoles: Object.assign(
      {},
      ...addedEntities.map((id) => ({
        [id]: submittedEntityRoles[id],
      })),
      ...removedEntities.map((id) => ({
        [id]: null,
      })),
      ...updatedEntities.map((id) => ({
        [id]: submittedEntityRoles[id],
      })),
    ),
  };
  const org = access.generalAccess.entity?.id;
  // update general access
  if (
    submittedState?.generalAccess?.type !== access.generalAccess.type ||
    submittedState?.generalAccess?.role !== access.generalAccess.entity?.role
  ) {
    switch (submittedState.generalAccess?.type) {
      case GeneralAccess.Restricted:
        if (org) {
          request.entityRoles[org] = null;
        }
        request.entityRoles[publicUserId] = null;
        break;
      case GeneralAccess.Organization:
        if (org) {
          request.entityRoles[org] =
            submittedState.generalAccess?.role ?? ArchitectureRole.Viewer;
        }
        request.entityRoles[publicUserId] = null;
        break;
      case GeneralAccess.Public:
        if (org) {
          request.entityRoles[org] = null;
        }
        request.entityRoles[publicUserId] =
          submittedState.generalAccess.role ?? ArchitectureRole.Viewer;
        break;
    }
  }
  return request;
}

export const AccessModal: FC<{
  user: User;
  architecture: Architecture;
  show?: boolean;
  onClose?: () => void;
  readonly?: boolean;
}> = ({ user, architecture, show, onClose, readonly }) => {
  const { updateArchitectureAccess, getArchitectureAccess, addError } =
    useApplicationStore();

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [access, setAccess] = useState<ArchitectureAccess | undefined>(
    undefined,
  );
  const methods = useForm<EntityRolesFormState>({});
  const { defaultValues, isDirty } = methods.formState;

  const watchEntityRoles: EntityRoleMap = methods.watch("entityRoles");

  const newEntities = entities.filter((entity) => watchEntityRoles[entity.id]);
  if (newEntities.length !== entities.length) {
    setEntities(newEntities);
  }

  useEffect(() => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    (async () => {
      try {
        const architectureAccess = await getArchitectureAccess(architecture.id);
        setAccess(architectureAccess);
      } catch (e: any) {
        onClose?.();
        addError(
          new UIError({
            message: `Retrieving access details for "${architecture.name}" failed.`,
            errorId: "AccessModal:getArchitectureAccess",
            cause: e,
            data: {
              architectureId: architecture.id,
            },
          }),
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!access) {
      return;
    }
    methods.reset(toEntityRolesFormState(access));
    setEntities(
      access?.entities
        .filter(
          (entity) =>
            entity.type !== "organization" && entity.id !== publicUserId,
        )
        .map((entity) => {
          return {
            ...entity,
            icon: (() => {
              if (entity.picture) {
                return (
                  <img
                    alt={"profile image"}
                    src={entity.picture}
                    className={"rounded-full"}
                  />
                );
              } else if (entity.type === "organization") {
                return <ShareIcon icon={FaBuildingLock} color={"blue"} />;
              } else if (entity.type === "team") {
                return <ShareIcon icon={FaUserGroup} color={"purple"} />;
              }

              return (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary-400 text-lg font-light text-white dark:bg-primary-500">
                  {`${entity.givenName?.[0] ?? ""}${
                    entity.familyName?.[0] ?? ""
                  }`}
                </div>
              );
            })(),
            type: entity.type,
            role: entity.role,
            email: entity.email,
          };
        }) ?? [],
    );
  }, [methods, access]);

  const isGeneralAccessDirty = methods.getFieldState("generalAccess").isDirty;

  const onSubmit = useCallback(
    async (data: EntityRolesFormState) => {
      if (!access || readonly) {
        return;
      }
      setIsSaving(true);
      let request = undefined;
      try {
        request = toAccessRequest(
          architecture.id,
          access,
          defaultValues as EntityRolesFormState,
          data,
        );
        await updateArchitectureAccess(request);

        if (!isGeneralAccessDirty) {
          onClose?.();
        }

        methods.reset(data);
      } catch (e: any) {
        addError(
          new UIError({
            message: `Updating access for "${architecture.name}" failed.`,
            errorId: "AccessModal:updateArchitectureAccess",
            cause: e,
            data: {
              architectureId: architecture.id,
              request,
            },
          }),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      access,
      architecture,
      defaultValues,
      isGeneralAccessDirty,
      methods,
      onClose,
      readonly,
      updateArchitectureAccess,
      addError,
    ],
  );

  const onSave = useCallback(() => {
    if (!methods.formState.isDirty || isSaving) {
      return;
    }

    const isValid = methods.trigger();
    if (!isValid) {
      return;
    }

    methods.handleSubmit(onSubmit)();
  }, [isSaving, methods, onSubmit]);

  const onClickCopyButton = async (e: any) => {
    e.target.blur();
    await navigator.clipboard.writeText(
      `${window.location.origin}/editor/${architecture.id}`,
    );
    setCopied(true);
    e.target.disabled = true;
    setTimeout(() => {
      e.target.disabled = false;
      setCopied(false);
    }, 1000);
  };

  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header>
        <span className="text-lg font-semibold">
          Share "{architecture.name}"
        </span>
      </Modal.Header>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} ref={formRef}>
          <Modal.Body className={"dark:text-white"}>
            <ErrorBoundary
              fallbackRender={FallbackRenderer}
              onError={(error, info) => {
                trackError(
                  new UIError({
                    message: "uncaught error in AccessModal",
                    errorId: "AccessModal:ErrorBoundary",
                    cause: error,
                    data: {
                      info,
                    },
                  }),
                );
              }}
            >
              {isLoading ? (
                <div className="flex w-full flex-col items-center gap-2">
                  <Spinner color={"purple"} size={"xl"} />
                  <div className="dark:text-gray-100">Loading...</div>
                </div>
              ) : (
                <div
                  className={"flex max-h-full flex-col gap-3 overflow-y-auto"}
                >
                  {env.debug.has("AddPeopleOrTeams") && (
                    <AddPeopleOrTeams
                      user={user}
                      entities={entities}
                      hidden={readonly}
                    />
                  )}
                  {access?.canShare && (
                    <>
                      <h3 className="text-lg font-medium">
                        People with access
                      </h3>
                      <SharedWithList
                        user={user}
                        entities={entities}
                        readonly={readonly}
                      />
                    </>
                  )}
                  <h3 className="text-lg font-medium">General access</h3>
                  {!isLoading && !!access && (
                    <GeneralAccessSelector
                      access={access}
                      readonly={readonly}
                      formRef={formRef}
                    />
                  )}
                </div>
              )}
            </ErrorBoundary>
          </Modal.Body>
          <Modal.Footer className={"flex justify-between"}>
            <div className={"flex items-center gap-2"}>
              <Button color="gray" outline onClick={onClickCopyButton}>
                <FaLink />
                <span className="ml-2">Copy Link</span>
              </Button>
              <div className="">
                {copied && (
                  <FaCheck
                    size={24}
                    className="text-green-500 dark:text-green-400"
                  />
                )}
              </div>
            </div>
            {isDirty && (
              <div className={"flex items-center gap-2"}>
                <span
                  className={
                    "pr-4 text-sm italic text-gray-500 dark:text-gray-400"
                  }
                >
                  {isSaving ? "" : "Pending Changes"}
                </span>
                <Button
                  color="purple"
                  isProcessing={isSaving && !isGeneralAccessDirty}
                  onClick={onSave}
                  processingSpinner={
                    <AiOutlineLoading className="animate-spin" />
                  }
                  disabled={isSaving && isGeneralAccessDirty}
                >
                  {isSaving ? "Saving" : "Save"}
                </Button>
              </div>
            )}
          </Modal.Footer>
        </form>
      </FormProvider>
    </Modal>
  );
};
export const actionMap = {
  viewer: "view",
  editor: "edit",
} as any;
const GeneralAccessSelector: FC<{
  access: ArchitectureAccess;
  readonly?: boolean;
  formRef: React.RefObject<HTMLFormElement>;
}> = ({ access, readonly, formRef }) => {
  // TODO: finish org support

  const { formState, watch, register, unregister, setValue, getFieldState } =
    useFormContext<EntityRolesFormState>();

  const { isSubmitting } = formState;

  const watchType: GeneralAccess = watch("generalAccess.type");
  const watchRole: ArchitectureRole | null = watch("generalAccess.role");

  const generalAccessOptions = getGeneralAccessOptions(access);

  useEffect(() => {
    register("generalAccess.type");
    register("generalAccess.role");
    return () => {
      unregister("generalAccess.type", { keepDefaultValue: true });
      unregister("generalAccess.role", { keepDefaultValue: true });
    };
  }, [register, unregister]);

  const onSelect = (field: string, value: string) => {
    setValue(field as any, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
    if (field === "generalAccess.type" && !watchRole) {
      setValue("generalAccess.role", ArchitectureRole.Viewer, {
        shouldTouch: true,
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  useEffect(() => {
    if (!getFieldState("generalAccess")?.isDirty) {
      return;
    }

    formRef.current?.requestSubmit();
  }, [formRef, getFieldState, watchRole, watchType]);

  const isUpdating = isSubmitting && getFieldState("generalAccess")?.isDirty;
  const roleLabel = isUpdating
    ? "Updating..."
    : watchRole
      ? getEnumKeyByEnumValue(ArchitectureRole, watchRole)
      : "";

  const selectedType = generalAccessOptions[watchType];
  return !selectedType ? (
    <></>
  ) : (
    <div
      className={
        "flex items-center justify-between gap-3 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-900"
      }
    >
      <div className={"flex items-start gap-2"}>
        {selectedType.icon}
        {readonly ? (
          <div className="ml-3">
            <EntityCard
              title={selectedType.label}
              subtitle={selectedType.description}
            />
          </div>
        ) : (
          <div className="justifiy-start flex flex-col">
            <Dropdown
              color={""}
              placement={"bottom-start"}
              label={selectedType.label}
              renderTrigger={() => (
                <Button
                  theme={{
                    base: "group flex items-stretch w-fit items-center px-3 text-center font-medium relative focus:z-10 focus:outline-none",
                    size: {
                      md: "text-sm font-medium gap-2",
                    },
                  }}
                  color={""}
                >
                  {selectedType.label}
                  <HiChevronDown />
                </Button>
              )}
            >
              {Object.entries(generalAccessOptions).map(
                ([name, option]: [string, any]) => (
                  <Dropdown.Item
                    key={option.value}
                    name={option.label}
                    value={option.value}
                    onClick={() => onSelect("generalAccess.type", option.value)}
                  >
                    {option.label}
                  </Dropdown.Item>
                ),
              )}
            </Dropdown>
            <div className="pl-3 text-xs text-gray-500">
              {selectedType.description}
            </div>
          </div>
        )}
      </div>
      {selectedType.value !== GeneralAccess.Restricted && (
        <>
          {readonly || isUpdating ? (
            <div
              className={classNames(
                "text-sm text-gray-500 dark:text-gray-400",
                {
                  "italic py-2.5 px-4": isUpdating,
                },
              )}
            >
              {roleLabel}
            </div>
          ) : (
            <Dropdown
              color={""}
              placement={"bottom-start"}
              label={roleLabel}
              disabled={readonly}
            >
              {[ArchitectureRole.Editor, ArchitectureRole.Viewer].map(
                (role) => (
                  <Dropdown.Item
                    key={role}
                    name={role}
                    value={role}
                    onClick={() => onSelect("generalAccess.role", role)}
                  >
                    {!!watchRole && (
                      <span className="w-8">
                        {role === watchRole && <FaCheck />}
                      </span>
                    )}
                    {getEnumKeyByEnumValue(ArchitectureRole, role)}
                  </Dropdown.Item>
                ),
              )}
            </Dropdown>
          )}
        </>
      )}
    </div>
  );
};
const SharedWithList: FC<{
  user: User;
  entities: Entity[];
  readonly?: boolean;
}> = ({ user, entities, readonly }) => {
  return (
    <ul className="flex flex-col">
      {entities.map((entity) => (
        <SharedWithItem
          key={entity.id}
          user={user}
          entity={entity}
          readonly={readonly}
        />
      ))}
    </ul>
  );
};
const SharedWithItem: FC<{
  user: User;
  entity: Entity;
  readonly?: boolean;
}> = ({ user, entity, readonly }) => {
  const { register, unregister, setValue, watch } = useFormContext();

  const fieldId = `entityRoles.${entity.id}`;

  useEffect(() => {
    register(fieldId);
    return () => {
      unregister(fieldId, { keepDefaultValue: true });
    };
  }, [fieldId, register, unregister]);

  const onSelect = (field: string, value: string | null) => {
    setValue(field, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const watchRole: ArchitectureRole | null = watch(fieldId);
  const loggedInUserId = `user:${user.sub}`;

  return (
    <li key={entity.id}>
      <div className="flex items-center justify-between gap-5 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-900">
        <div className="flex items-center justify-between gap-5">
          <div className={"max-w-8 h-8 max-h-8 w-8 rounded-full"}>
            {entity.icon}
          </div>
          {!entity.name && !entity.email ? (
            <div className="flex flex-col">
              <div className="text-sm font-medium">{entity.id}</div>
            </div>
          ) : (
            <EntityCard
              title={entity.name ?? entity.id}
              subtitle={entity.email}
            />
          )}
        </div>

        {readonly ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {watchRole === ArchitectureRole.Owner &&
            loggedInUserId === entity.id
              ? "Owner (You)"
              : watchRole
                ? getEnumKeyByEnumValue(ArchitectureRole, watchRole)
                : ""}
          </div>
        ) : (
          <>
            {entity.role === ArchitectureRole.Owner ? (
              <Dropdown
                color={""}
                arrowIcon={false}
                disabled
                placement={"bottom-start"}
                label={`Owner${loggedInUserId === entity.id ? " (You)" : ""}`}
              />
            ) : (
              <Dropdown
                color={""}
                placement={"bottom-start"}
                label={
                  watchRole
                    ? getEnumKeyByEnumValue(ArchitectureRole, watchRole)
                    : "Select a role"
                }
              >
                {[ArchitectureRole.Editor, ArchitectureRole.Viewer].map(
                  (role: any) => (
                    <Dropdown.Item
                      key={role}
                      name={role}
                      onClick={() => onSelect(fieldId, role)}
                    >
                      {!!watchRole && (
                        <span className="w-8">
                          {role === watchRole && <FaCheck />}
                        </span>
                      )}
                      <span>
                        {" "}
                        {getEnumKeyByEnumValue(ArchitectureRole, role)}{" "}
                      </span>
                    </Dropdown.Item>
                  ),
                )}
                <Dropdown.Divider />
                <Dropdown.Item
                  name={"remove"}
                  value={"remove"}
                  onClick={() => onSelect(fieldId, null)}
                >
                  <span className="ml-8">Remove Access</span>
                </Dropdown.Item>
              </Dropdown>
            )}
          </>
        )}
      </div>
    </li>
  );
};
const EntityCard: FC<{
  title?: string;
  subtitle?: string;
}> = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col text-left">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
};

interface GeneralAccessOption {
  label: string;
  description: string;
  value: GeneralAccess;
  icon: React.ReactElement;
}

interface GeneralAccessOptions {
  [key: string]: GeneralAccessOption;
}

function getGeneralAccessOptions(
  access: ArchitectureAccess,
): GeneralAccessOptions {
  // TODO: make this the actual org name
  const mockOrganization = "Klotho";

  // the order of these options matters right now since it's also the display order in the dropdown
  const options: GeneralAccessOptions = {
    restricted: {
      label: "Restricted",
      description: "Only people with access can open with the link",
      value: GeneralAccess.Restricted,
      icon: <ShareIcon icon={MdOutlineLock} color={"gray"} />,
    },
    organization: {
      label: `${mockOrganization} organization`,
      description: `Anyone in the ${mockOrganization} organization can ${
        actionMap[access.generalAccess.entity?.role ?? ""] ?? "open"
      } with the link`,
      value: GeneralAccess.Organization,
      icon: <ShareIcon icon={FaBuildingLock} color={"blue"} />,
    },
    public: {
      label: "Anyone with the link",
      description: `Anyone with the link can ${
        actionMap[access.generalAccess.entity?.role ?? ""] ?? "open"
      }`,
      value: GeneralAccess.Public,
      icon: <ShareIcon icon={FaGlobeAmericas} color={"green"} />,
    },
  };
  if (!access.entities.some((e) => e.type === "organization")) {
    delete options.organization;
  }
  return options;
}
