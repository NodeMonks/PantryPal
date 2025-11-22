import { StateCreator, create } from "zustand";
import { persist } from "zustand/middleware";
import { OrganizationRegistrationInput } from "@shared/schema";

export type RegistrationStep = 1 | 2 | 3;

interface RegistrationState {
  step: RegistrationStep;
  organizationName: string;
  stores: string[];
  admin: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    full_name: string;
    phone: string;
  };
  setStep: (step: RegistrationStep) => void;
  setOrganizationName: (name: string) => void;
  setStoreName: (index: number, name: string) => void;
  addStore: () => void;
  removeStore: (index: number) => void;
  setAdminField: (
    field: keyof RegistrationState["admin"],
    value: string
  ) => void;
  reset: () => void;
}

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    ((set: any, get: any) => ({
      step: 1,
      organizationName: "",
      stores: [""],
      admin: {
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        phone: "",
      },
      setStep: (step: RegistrationStep) => set({ step }),
      setOrganizationName: (name: string) => set({ organizationName: name }),
      setStoreName: (index: number, name: string) =>
        set({
          stores: get().stores.map((s: string, i: number) =>
            i === index ? name : s
          ),
        }),
      addStore: () =>
        set({
          stores:
            get().stores.length < 10 ? [...get().stores, ""] : get().stores,
        }),
      removeStore: (index: number) =>
        set({
          stores: get().stores.filter((_: string, i: number) => i !== index),
        }),
      setAdminField: (field: keyof RegistrationState["admin"], value: string) =>
        set({ admin: { ...get().admin, [field]: value } }),
      reset: () =>
        set({
          step: 1,
          organizationName: "",
          stores: [""],
          admin: {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            full_name: "",
            phone: "",
          },
        }),
    })) as StateCreator<RegistrationState>,
    { name: "registration-store" }
  )
);

export const buildPayload = (): OrganizationRegistrationInput => {
  const state = useRegistrationStore.getState();
  return {
    organization: { name: state.organizationName },
    stores: state.stores.filter((s) => s.trim()).map((name) => ({ name })),
    admin: {
      username: state.admin.username,
      email: state.admin.email,
      password: state.admin.password,
      full_name: state.admin.full_name,
      phone: state.admin.phone || undefined,
    },
  } as OrganizationRegistrationInput;
};
