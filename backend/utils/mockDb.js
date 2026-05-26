class MockQuery {
  constructor(collection, filters = [], orderings = [], limitVal = null) {
    this.collection = collection;
    this.filters = filters;
    this.orderings = orderings;
    this.limitVal = limitVal;
  }

  where(field, op, value) {
    return new MockQuery(
      this.collection,
      [...this.filters, { field, op, value }],
      this.orderings,
      this.limitVal
    );
  }

  orderBy(field, direction = 'asc') {
    return new MockQuery(
      this.collection,
      this.filters,
      [...this.orderings, { field, direction }],
      this.limitVal
    );
  }

  limit(val) {
    return new MockQuery(this.collection, this.filters, this.orderings, val);
  }

  count() {
    return {
      get: async () => {
        const docs = this._execute();
        return {
          data: () => ({ count: docs.length })
        };
      }
    };
  }

  _execute() {
    let docs = Array.from(this.collection.docs.entries()).map(([id, data]) => ({
      id,
      ...data
    }));

    for (const filter of this.filters) {
      docs = docs.filter(doc => {
        const val = doc[filter.field];
        const target = filter.value;
        
        if (filter.op === '==') return val === target;
        if (filter.op === '!=') return val !== target;
        if (filter.op === '>=') return val >= target;
        if (filter.op === '<=') return val <= target;
        if (filter.op === '>') return val > target;
        if (filter.op === '<') return val < target;
        if (filter.op === 'in') return Array.isArray(target) && target.includes(val);
        if (filter.op === 'array-contains') return Array.isArray(val) && val.includes(target);
        
        return true;
      });
    }

    // Apply sorting
    if (this.orderings.length > 0) {
      docs.sort((a, b) => {
        for (const ord of this.orderings) {
          let valA = a[ord.field];
          let valB = b[ord.field];
          
          // Handle undefined/nulls
          if (valA === undefined || valA === null) {
            if (valB !== undefined && valB !== null) return 1;
            continue;
          }
          if (valB === undefined || valB === null) {
            return -1;
          }
          
          // Handle dates
          if (valA instanceof Date) valA = valA.getTime();
          if (valB instanceof Date) valB = valB.getTime();
          if (typeof valA === 'string' && !isNaN(Date.parse(valA)) && valA.includes('-')) valA = new Date(valA).getTime();
          if (typeof valB === 'string' && !isNaN(Date.parse(valB)) && valB.includes('-')) valB = new Date(valB).getTime();

          if (valA < valB) return ord.direction === 'desc' ? 1 : -1;
          if (valA > valB) return ord.direction === 'desc' ? -1 : 1;
        }
        return 0;
      });
    }

    if (this.limitVal !== null) {
      docs = docs.slice(0, this.limitVal);
    }

    return docs;
  }

  async get() {
    const results = this._execute();
    return {
      empty: results.length === 0,
      size: results.length,
      docs: results.map(doc => ({
        id: doc.id,
        exists: true,
        data: () => doc
      })),
      forEach: (cb) => {
        results.forEach(doc => {
          cb({
            id: doc.id,
            exists: true,
            data: () => doc
          });
        });
      }
    };
  }
}

class MockCollection {
  constructor(name) {
    this.name = name;
    this.docs = new Map();
  }

  doc(id) {
    const self = this;
    return {
      get: async () => {
        const exists = self.docs.has(id);
        const data = exists ? self.docs.get(id) : undefined;
        return {
          exists,
          id,
          data: () => data
        };
      },
      set: async (data) => {
        self.docs.set(id, { ...data, id });
        return { success: true };
      },
      update: async (data) => {
        const existing = self.docs.get(id) || {};
        const updated = { ...existing };
        
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && value.__isFieldValue) {
            if (value.type === 'arrayUnion') {
              const currentArray = Array.isArray(updated[key]) ? updated[key] : [];
              updated[key] = [...currentArray, ...value.elements];
            }
          } else {
            updated[key] = value;
          }
        }
        
        self.docs.set(id, updated);
        return { success: true };
      },
      delete: async () => {
        self.docs.delete(id);
        return { success: true };
      }
    };
  }

  where(field, op, value) {
    return new MockQuery(this).where(field, op, value);
  }

  orderBy(field, direction) {
    return new MockQuery(this).orderBy(field, direction);
  }

  limit(val) {
    return new MockQuery(this).limit(val);
  }

  async get() {
    return new MockQuery(this).get();
  }
}

class MockFirestore {
  constructor() {
    this.collections = new Map();
    this.firestore = {
      FieldValue: {
        arrayUnion: (...elements) => ({
          __isFieldValue: true,
          type: 'arrayUnion',
          elements
        }),
        serverTimestamp: () => new Date()
      }
    };
    this.FieldValue = this.firestore.FieldValue;
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name);
  }
}

const mockDb = new MockFirestore();
module.exports = mockDb;
