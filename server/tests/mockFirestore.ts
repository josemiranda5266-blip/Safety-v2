export function createMockFirestore() {
  let collections = new Map<string, Map<string, Record<string, unknown>>>();

  function getCollectionMap(name: string) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name)!;
  }

  const mockDb = {
    _clear: () => {
      collections = new Map();
    },
    batch: () => ({
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: async () => {},
    }),
    collection(colName: string) {
      const colMap = getCollectionMap(colName);

      return {
        doc(docId: string) {
          return {
            id: docId,
            async get() {
              const exists = colMap.has(docId);
              const data = exists ? { ...colMap.get(docId)! } : undefined;
              return {
                id: docId,
                exists,
                data: () => data,
              };
            },
            async set(data: Record<string, unknown>, setOptions?: { merge?: boolean }) {
              if (setOptions?.merge && colMap.has(docId)) {
                colMap.set(docId, { ...colMap.get(docId)!, ...data });
              } else {
                colMap.set(docId, { ...data });
              }
            },
            async delete() {
              colMap.delete(docId);
            },
            collection: (subCol: string) => mockDb.collection(`${colName}/${docId}/${subCol}`)
          };
        },
        where(field: string, op: string, value: unknown) {
          const filters: Array<{ field: string; op: string; value: unknown }> = [{ field, op, value }];
          let limitCount: number | undefined = undefined;

          const queryObj: any = {
            where(f: string, o: string, v: unknown) {
              filters.push({ field: f, op: o, value: v });
              return queryObj;
            },
            limit(n: number) {
              limitCount = n;
              return queryObj;
            },
            async get() {
              let matches: Array<{ id: string; ref: { id: string }; data: () => Record<string, unknown> }> = [];
              for (const [id, docData] of colMap.entries()) {
                const satisfiesAll = filters.every((filter) => {
                  if (filter.op === "==") {
                    return docData[filter.field] === filter.value;
                  }
                  return true;
                });
                if (satisfiesAll) {
                  matches.push({
                    id,
                    ref: { id },
                    data: () => ({ ...docData }),
                  });
                }
              }
              if (limitCount !== undefined) {
                matches = matches.slice(0, limitCount);
              }
              return {
                empty: matches.length === 0,
                docs: matches,
              };
            },
          };
          return queryObj;
        },
        async get() {
          const matches: Array<{ id: string; ref: { id: string }; data: () => Record<string, unknown> }> = [];
          for (const [id, docData] of colMap.entries()) {
            matches.push({
              id,
              ref: { id },
              data: () => ({ ...docData }),
            });
          }
          return {
            empty: matches.length === 0,
            docs: matches,
          };
        },
      };
    },
  };
  return mockDb;
}
