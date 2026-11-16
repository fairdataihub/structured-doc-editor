// The metadata step of the /import flow: which fields a dataset card shows and where each lives in the RDA JSON.

export interface ImportMetaField<T> {
  id: string;
  label: string;
  full?: boolean;
  area?: boolean;
  options?: string[];
  example?: string;
  get: (owner: T) => string | null | undefined;
  set: (owner: T, value: string | null) => void;
}

export const metaBlank = (value: unknown) =>
  value == null ? "" : String(value);

/** The extraction sometimes writes the text "null" where it means no value. */
export function normalizeRdaNulls<T>(value: T): T {
  if (value === "null") return null as T;

  if (Array.isArray(value)) return value.map(normalizeRdaNulls) as T;

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeRdaNulls(item),
      ]),
    ) as T;
  }

  return value;
}

const firstDistribution = (dataset: RdaDataset) => {
  dataset.distribution ??= [{}];

  return (dataset.distribution[0] ??= {});
};

const firstMetadata = (dataset: RdaDataset) => {
  dataset.metadata ??= [{}];

  return (dataset.metadata[0] ??= {});
};

export const DATASET_FIELDS: ImportMetaField<RdaDataset>[] = [
  {
    id: "title",
    label: "Title",
    full: true,
    get: (d) => d.title,
    set: (d, v) => (d.title = v),
  },
  {
    id: "description",
    label: "Description",
    full: true,
    area: true,
    get: (d) => d.description,
    set: (d, v) => (d.description = v),
  },
  {
    id: "type",
    label: "Type",
    options: [
      "Dataset",
      "Software",
      "Text",
      "Image",
      "Audiovisual",
      "Model",
      "Other",
    ],
    get: (d) => d.type,
    set: (d, v) => (d.type = v),
  },
  {
    id: "doi",
    label: "Dataset ID (DOI)",
    example: "10.5281/zenodo.1234567",
    get: (d) => d.dataset_id?.identifier,
    set: (d, v) => (d.dataset_id = { identifier: v, type: v ? "doi" : null }),
  },
  {
    id: "personal",
    label: "Personal data",
    options: ["yes", "no", "unknown"],
    get: (d) => d.personal_data,
    set: (d, v) => (d.personal_data = v),
  },
  {
    id: "sensitive",
    label: "Sensitive data",
    options: ["yes", "no", "unknown"],
    get: (d) => d.sensitive_data,
    set: (d, v) => (d.sensitive_data = v),
  },
  {
    id: "language",
    label: "Metadata language",
    example: "eng",
    get: (d) => d.metadata?.[0]?.language,
    set: (d, v) => (firstMetadata(d).language = v),
  },
  {
    id: "access",
    label: "Data access",
    options: ["open", "shared", "closed"],
    get: (d) => d.distribution?.[0]?.data_access,
    set: (d, v) => (firstDistribution(d).data_access = v),
  },
  {
    id: "license",
    label: "License",
    get: (d) => d.distribution?.[0]?.license?.[0]?.license_ref,
    set: (d, v) => {
      const distribution = firstDistribution(d);

      distribution.license ??= [{}];
      (distribution.license[0] ??= {}).license_ref = v;
    },
  },
  {
    id: "host",
    label: "Host name",
    get: (d) => d.distribution?.[0]?.host?.title,
    set: (d, v) => ((firstDistribution(d).host ??= {}).title = v),
  },
  {
    id: "hostUrl",
    label: "Host URL",
    example: "https://zenodo.org",
    get: (d) => d.distribution?.[0]?.host?.url,
    set: (d, v) => ((firstDistribution(d).host ??= {}).url = v),
  },
];

/** RDA has no creator on a dataset, so they are kept in a `creator` list on each dataset. */
export const CREATOR_FIELDS: ImportMetaField<RdaCreator>[] = [
  {
    id: "name",
    label: "Name",
    example: "Jane Doe",
    get: (p) => p.name,
    set: (p, v) => (p.name = v),
  },
  {
    id: "affiliation",
    label: "Affiliation",
    example: "CALMI2",
    get: (p) => p.affiliation?.[0]?.name,
    set: (p, v) => {
      p.affiliation ??= [{}];
      (p.affiliation[0] ??= {}).name = v;
    },
  },
  {
    id: "orcid",
    label: "ID (ORCID)",
    example: "0000-0002-1825-0097",
    get: (p) => p.creator_id?.identifier,
    set: (p, v) => (p.creator_id = { identifier: v, type: v ? "orcid" : null }),
  },
];

export const newRdaCreator = (): RdaCreator => ({
  name: null,
  affiliation: [{ name: null }],
  creator_id: { identifier: null, type: null },
});

export function addRdaCreator(dataset: RdaDataset) {
  (dataset.creator ??= []).push(newRdaCreator());
}

export function removeRdaCreator(dataset: RdaDataset, index: number) {
  dataset.creator?.splice(index, 1);
}

/** The samples name nobody; for the demo, give each dataset a placeholder creator. */
export function fillDemoCreators(rda: RdaDocument) {
  (rda.dmp.dataset ?? []).forEach((dataset) => {
    if ((dataset.creator ?? []).some((p) => metaBlank(p.name).trim())) return;

    dataset.creator = [
      {
        name: "Jane Doe",
        affiliation: [{ name: "CALMI2" }],
        creator_id: { identifier: "0000-0002-1825-0097", type: "orcid" },
      },
    ];
  });
}
