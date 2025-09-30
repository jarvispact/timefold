export const arraySwapDelete = <Item>(arr: Item[], idx: number) => {
    arr[idx] = arr[arr.length - 1];
    return arr.pop();
};
