type CamelizeOptions = {
  isSimpleString?: boolean,
  stopAtKeys?: (string | RegExp)[],
  preserveDots?: boolean,
};

const matchOne = (list: (string | RegExp)[] | undefined, value: string) =>
  !!list?.some((p) => (typeof p === "string" ?
    p === value :
    p.test(value)));

const toCamelCase = (str: string): string => {
  const words = str
    .replace(/[_\-\s]+/g, " ")
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);

  if (!words) return "";

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ?
        lower :
        lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
};

const camelizeKey = (key: string, preserveDots: boolean): string => {
  if (!preserveDots) {
    return toCamelCase(key.replace(/\./g, " "));
  }
  return key
    .split(".")
    .map((part) => toCamelCase(part))
    .join(".");
};

export const camelize = (input: any, options: CamelizeOptions | boolean = {}): any => {
  const resolvedOptions: CamelizeOptions = typeof options === "boolean" ?
    { isSimpleString: options } :
    options;

  const {
    isSimpleString = false,
    stopAtKeys = [],
    preserveDots = false,
  } = resolvedOptions;

  if (typeof input === "string" && isSimpleString) {
    return toCamelCase(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => camelize(item, resolvedOptions));
  }

  if (input !== null && typeof input === "object") {
    return Object.entries(input).reduce<Record<string, any>>((acc, [ key, value ]) => {
      const outKey = camelizeKey(key, preserveDots);

      const stop = matchOne(stopAtKeys, key) || matchOne(stopAtKeys, outKey);

      acc[ outKey ] = stop ?
        value :
        camelize(value, resolvedOptions);
      return acc;
    }, {});
  }

  return input;
};
