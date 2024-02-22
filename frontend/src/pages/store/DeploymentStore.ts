import { type StateCreator } from "zustand";
import { type Stack } from "../../shared/deployment/stack";
import createStack from "../../api/CreateStack";
import { type EditorStore } from "./EditorStore";
import listStackEvents from "../../api/ListStackEvents";
import { type Deployment } from "../../shared/deployment/deployment";
import listStacks from "../../api/ListStacks";
import listStackResources from "../../api/ListStackResources";

interface DeploymentStoreState {
  stacks: Stack[];
  selectedStack?: Stack;
  deployments: Deployment[];
  selectedDeployment?: Deployment;
  resources: any[];
}

const initialState: () => DeploymentStoreState = () => ({
  stacks: [],
  deployments: [],
  resources: [],
});

interface DeploymentStoreActions {
  createStack(stack: Stack): void;
  listStacks(): void;
  selectStack(stack?: Stack): void;
  listDeployments(stack: Stack): void;
  listStackResources(stack: Stack): void;
}

interface DeploymentStoreBase
  extends DeploymentStoreState,
    DeploymentStoreActions {}

export type DeploymentStore = DeploymentStoreBase & EditorStore;

export const deploymentStore: StateCreator<
  DeploymentStore,
  [],
  [],
  DeploymentStoreBase
> = (set: (state: object, replace?: boolean, id?: string) => any, get) => ({
  ...initialState(),
  createStack: async (stack: Stack) => {
    await createStack({
      name: stack.name,
      architecture: stack.architecture_id,
      environmentVersion: stack.environment_id,
      provider: stack.provider,
      providerDetails: {},
      idToken: get().currentIdToken.idToken,
    });
    get().listStacks();
  },
  listStacks: async () => {
    const stacks = await listStacks({
      idToken: get().currentIdToken.idToken,
      architecture: get().architecture.id,
      environmentVersion: get().environmentVersion.id,
    });
    set((state: DeploymentStoreState) => {
      return {
        stacks: stacks,
      };
    });
  },
  selectStack: (stack?: Stack) => {
    set((state: DeploymentStoreState) => {
      return {
        selectedStack: stack,
      };
    });
  },
  listDeployments: async (stack: Stack) => {
    const deployments = await listStackEvents({
      idToken: get().currentIdToken.idToken,
      architecture: get().architecture.id,
      environmentVersion: get().environmentVersion.id,
      name: stack.name,
    });
    set((state: DeploymentStoreState) => {
      return {
        deployments: deployments,
      };
    });
    return;
  },
  listStackResources: async (stack: Stack) => {
    const resources = await listStackResources({
      idToken: get().currentIdToken.idToken,
      architecture: get().architecture.id,
      environmentVersion: get().environmentVersion.id,
      name: stack.name,
    });
    set((state: DeploymentStoreState) => {
      return {
        resources: resources,
      };
    });
    return;
  },
});
