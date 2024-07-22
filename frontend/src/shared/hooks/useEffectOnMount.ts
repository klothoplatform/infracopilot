import { useEffect } from "react";

// eslint-disable-next-line react-hooks/exhaustive-deps
export const useEffectOnMount = (func: () => any) => useEffect(func, []);
