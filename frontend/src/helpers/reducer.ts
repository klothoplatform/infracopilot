export default function reducer(state: any, { field, value }: any) {
  return {
    ...state,
    [field]: value,
  };
}
