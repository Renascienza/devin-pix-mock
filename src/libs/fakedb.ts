import { MESSAGES } from './messages';

export type Dictionary<T> = { [key: string]: T };

export class MemoryDB {
  private static collections: Dictionary<MemoryDB> = {};
  private cluster: Dictionary<any[]> = {};

  private constructor(
    private sortKeys: string[],
    public name: string,
  ) {
    if (sortKeys.length === 0) {
      throw new Error('Sort Key Required');
    }
  }

  public static create(collectionName: string, sortKeys: string[]): MemoryDB {
    if (MemoryDB.collections[collectionName]) {
      throw new Error('Duplicate Collection');
    } else {
      return (MemoryDB.collections[collectionName] = new MemoryDB(
        sortKeys,
        collectionName,
      ));
    }
  }

  public static ensure(collectionName: string, sortKeys: string[]): MemoryDB {
    return (
      MemoryDB.collections[collectionName] ||
      MemoryDB.create(collectionName, sortKeys)
    );
  }

  public static get(collectionName: string): MemoryDB {
    return MemoryDB.collections[collectionName];
  }

  //Ao menos um item da sortKey deve ser encontrado
  private skCompare = (keys: any[]) => {
    if (!keys.find((f1) => this.sortKeys.find((f2) => f2 === f1))) {
      throw new Error(
        MESSAGES.Errors.defaults.INVALID_CONTENT(`${this.name}->sortKey`),
      );
    }
  };

  //Ao menos um item da sortKey deve ser encontrado
  private skValidate = (data: any) => {
    if (
      !this.sortKeys.find((k) =>
        Object.keys(data).find(
          (f) => f === k && data[f] != null && data[f] != undefined,
        ),
      )
    ) {
      throw new Error(
        MESSAGES.Errors.defaults.NOT_FOUNT(`${this.name}->sortKey`),
      );
    }
  };

  async read(clusterKey: string, sortKey: { [name: string]: string | number }) {
    const keys = Object.keys(sortKey);
    this.skCompare(keys);
    return this.cluster[clusterKey]?.find(
      (f) => keys.filter((k) => sortKey[k] === f[k]).length === keys.length,
    );
  }

  async add(clusterKey: string, data: any): Promise<any> {
    this.skValidate(data);
    if (await this.read(clusterKey, data)) {
      throw new Error('Duplicate Key');
    }
    if (!this.cluster[clusterKey]) {
      this.cluster[clusterKey] = [data];
    } else {
      this.cluster[clusterKey].push(data);
    }
    return data;
  }

  async patch(
    clusterKey: string,
    sortKey: { [name: string]: string | number },
    data: any,
  ): Promise<any> {
    this.skValidate(sortKey);
    const curr = await this.read(clusterKey, sortKey);
    if (!curr) {
      throw new Error(MESSAGES.Errors.defaults.NOT_FOUNT(this.name));
    } else {
      const keys = Object.keys(sortKey);
      const idx = this.cluster[clusterKey].findIndex(
        (f) => keys.filter((k) => sortKey[k] === f[k]).length === keys.length,
      );
      const merge = { ...curr, ...data };
      this.cluster[clusterKey].splice(idx, 1, merge);
      return merge;
    }
  }

  async update(
    clusterKey: string,
    sortKey: { [name: string]: string | number },
    data: any,
  ): Promise<any> {
    this.skValidate(sortKey);
    this.skValidate(data);
    const curr = await this.read(clusterKey, sortKey);
    if (!curr) {
      throw new Error(MESSAGES.Errors.defaults.NOT_FOUNT(this.name));
    } else {
      const keys = Object.keys(sortKey);
      const idx = this.cluster[clusterKey].findIndex(
        (f) => keys.filter((k) => sortKey[k] === f[k]).length === keys.length,
      );
      this.cluster[clusterKey].splice(idx, 1, data);
      return await this.read(clusterKey, sortKey);
    }
  }

  async list(clusterKey: string | number, sortAscending: boolean = true) {
    return (this.cluster[clusterKey] || []).sort((a, b) =>
      a[this.sortKeys[0]] < b[this.sortKeys[0]]
        ? sortAscending
          ? -1
          : 1
        : sortAscending
          ? 1
          : -1,
    );
  }

  async remove(
    clusterKey: string,
    sortKey?: { [name: string]: string | number },
  ): Promise<boolean> {
    this.skValidate(sortKey);
    const curr = await this.read(clusterKey, sortKey);
    if (!curr) {
      return undefined;
    } else {
      const keys = Object.keys(sortKey);
      const idx = this.cluster[clusterKey].findIndex(
        (f) => keys.filter((k) => sortKey[k] === f[k]).length === keys.length,
      );
      return this.cluster[clusterKey].splice(idx, 1).length > 0;
    }
  }
}
