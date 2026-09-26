import type { Source } from "./types";

// ---------------------------------------------------------------------------
// SYNTHETIC DATA — DEMO ONLY. Not medical advice.
//
// These abstracts are invented for demonstration. Authors, journals, effect
// sizes, and p-values are fictional. Do not use for any clinical purpose.
// ---------------------------------------------------------------------------

export const SYNTHETIC_SOURCES: Source[] = [
  {
    id: "S1",
    title: "Adjuvant zolgetinib in resected stage III melanoma: the AURORA-3 trial",
    authors: "Marlow K, et al. (synthetic)",
    year: 2023,
    specialty: "oncology",
    body: "In this randomized phase III trial, adjuvant zolgetinib reduced the risk of recurrence in patients with resected stage III melanoma. The 3-year recurrence-free survival was 62% in the zolegitinib arm versus 48% in the placebo arm (hazard ratio 0.61, p=0.002). Grade 3 or higher adverse events occurred in 24% of treated patients. No new safety signals were observed.",
  },
  {
    id: "S2",
    title: "Pembrozumab plus chemotherapy in metastatic non-small-cell lung cancer",
    authors: "Ibarra L, et al. (synthetic)",
    year: 2022,
    specialty: "oncology",
    body: "Patients with previously untreated metastatic NSCLC were randomized to pembrozumab plus chemotherapy or chemotherapy alone. Median overall survival was 18.4 months with the combination versus 11.9 months with chemotherapy alone. The objective response rate was 47% versus 29%. Immune-related adverse events were more frequent in the combination arm.",
  },
  {
    id: "S3",
    title: "Topical rimexolone 0.1% for moderate plaque psoriasis: a 16-week study",
    authors: "Sorensen A, et al. (synthetic)",
    year: 2024,
    specialty: "dermatology",
    body: "This double-blind study evaluated topical rimexolone 0.1% cream in adults with moderate plaque psoriasis. At week 16, 54% of patients achieved a PASI 75 response with rimexolone compared with 21% with vehicle. Application-site irritation was reported by 9% of patients. The treatment was well tolerated over the study period.",
  },
  {
    id: "S4",
    title: "Dupatinib for moderate-to-severe atopic dermatitis in adolescents",
    authors: "Ng P, et al. (synthetic)",
    year: 2023,
    specialty: "dermatology",
    body: "Adolescents aged 12 to 17 with moderate-to-severe atopic dermatitis received dupatinib or placebo for 12 weeks. An EASI-75 response was achieved by 61% of dupatinib-treated adolescents versus 24% of those receiving placebo. Improvements in itch scores were observed as early as week 2. Conjunctivitis occurred in 8% of the dupatinib group.",
  },
  {
    id: "S5",
    title: "Neoadjuvant chemoradiotherapy in locally advanced rectal cancer",
    authors: "Beaulieu M, et al. (synthetic)",
    year: 2021,
    specialty: "oncology",
    body: "In locally advanced rectal cancer, neoadjuvant chemoradiotherapy produced a pathological complete response in 28% of patients. The 5-year local recurrence rate was 6% in the chemoradiotherapy group. Sphincter preservation was achieved in 74% of cases. Acute grade 3 toxicity was uncommon.",
  },
  {
    id: "S6",
    title: "Narrowband UVB phototherapy for vitiligo: a prospective cohort",
    authors: "Costa R, et al. (synthetic)",
    year: 2022,
    specialty: "dermatology",
    body: "This prospective cohort assessed narrowband UVB phototherapy in patients with non-segmental vitiligo. After 6 months, at least 50% repigmentation was seen in 43% of treated areas. Facial lesions responded better than acral lesions. No serious adverse events were reported during follow-up.",
  },
  {
    id: "S7",
    title: "Osimeranib in EGFR-mutated advanced lung adenocarcinoma",
    authors: "Fujimoto H, et al. (synthetic)",
    year: 2023,
    specialty: "oncology",
    body: "Among patients with EGFR-mutated advanced lung adenocarcinoma, first-line osimeranib prolonged progression-free survival to a median of 19.1 months compared with 10.2 months for standard EGFR inhibitors. Central nervous system progression was less frequent with osimeranib. The most common adverse event was rash.",
  },
  {
    id: "S8",
    title: "Oral isotrenoin dosing strategies in severe nodular acne",
    authors: "Haddad Y, et al. (synthetic)",
    year: 2024,
    specialty: "dermatology",
    body: "This trial compared low-dose and conventional-dose oral isotrenoin in severe nodular acne. Complete clearance at 6 months was similar between arms, at 82% and 85% respectively. Cumulative dose correlated with relapse: relapse occurred in 32% of the low-dose group versus 19% of the conventional-dose group. Mucocutaneous side effects were dose-dependent.",
  },
  {
    id: "S9",
    title: "Trastuzemab deruxtecan in HER2-low metastatic breast cancer",
    authors: "Okonkwo N, et al. (synthetic)",
    year: 2022,
    specialty: "oncology",
    body: "In HER2-low metastatic breast cancer, trastuzemab deruxtecan improved median progression-free survival to 9.9 months versus 5.1 months with physician's choice of chemotherapy. The objective response rate was 52%. Interstitial lung disease was an adverse event of special interest and occurred in 12% of patients.",
  },
  {
    id: "S10",
    title: "Apremilax for moderate plaque psoriasis of the scalp",
    authors: "Delacroix E, et al. (synthetic)",
    year: 2023,
    specialty: "dermatology",
    body: "Adults with moderate scalp psoriasis received apremilax or placebo for 16 weeks. A Scalp Physician Global Assessment score of clear or almost clear was reached by 39% of the apremilax group versus 15% of the placebo group. Diarrhea and nausea were the most common adverse events and were generally mild.",
  },
];

export function getSourceById(id: string): Source | undefined {
  return SYNTHETIC_SOURCES.find((s) => s.id === id);
}
