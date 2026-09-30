"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DossierViewer } from "../../components/DossierViewer";
import { AdminSettingsPanel } from "../../components/AdminSettingsPanel";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useInterfaceSettings } from "../../components/useInterfaceSettings";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  FilePlus2,
  FileText,
  GraduationCap,
  List,
  LogOut,
  Menu,
  Palette,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
// Zone tactile confortable (44px) sur téléphone et tablette uniquement
const touch = "max-[1024px]:min-h-[44px]";
type View = "students" | "add" | "secretaries" | "settings";
type Cycle = "LICENCE" | "MASTER";
type Student = {
  id: string;
  registrationNumber: string;
  fullName: string;
  email: string | null;
  phone: string;
  gender: string;
  level: string;
  program: string;
  registrationForm: string;
  active: boolean;
  quitus: { code: string } | null;
  address?: string | null;
  cin?: string | null;
  nationality?: string | null;
  birthDatePlace?: string | null;
  quality?: "PASSANT" | "REDOUBLANT" | null;
};
type Secretary = {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  createdAt: string;
};
type Option = {
  id: string;
  name: string;
  active: boolean;
  type: "NIVEAU" | "PARCOURS";
  cycle: Cycle;
};
type Curriculum = { levels: Option[]; programs: Option[] };
type StudentForm = {
  fullName: string;
  email: string;
  phone: string;
  gender: "FEMININ" | "MASCULIN" | "AUTRE";
  registrationForm: "LICENCE" | "MASTER";
  level: string;
  program: string;
  birthDatePlace: string;
  cin: string;
  nationality: string;
  address: string;
  previousEstablishment: string;
  bacYear: string;
  bacSeries: string;
  bacCenter: string;
  previousUniversityRegistration: string;
  fatherName: string;
  motherName: string;
  parentsPhone: string;
  parentsCity: string;
  respondentName: string;
  respondentPhone: string;
  respondentAddress: string;
  maritalStatus: string;
  licenceYear: string;
  mention: string;
  previousLevel: string;
  previousProgram: string;
  quality: "PASSANT" | "REDOUBLANT" | "";
};
type EnrollmentMode = "NEW" | "RENEWAL";
type FormStep = { title: string; description: string; fields: (keyof StudentForm)[] };
const getEnrollmentSteps = (cycle: Cycle): FormStep[] => [
  {
    title: "Cycle d'inscription",
    description: "Choisissez si l'étudiant s'inscrit en Licence ou en Master.",
    fields: [],
  },
  {
    title: "Identité & contact",
    description: "Informations personnelles et coordonnées de l'étudiant.",
    fields: cycle === "MASTER"
      ? ["fullName", "birthDatePlace", "maritalStatus", "nationality", "address", "phone", "email"]
      : ["fullName", "birthDatePlace", "cin", "nationality", "address", "phone", "email"],
  },
  {
    title: cycle === "MASTER" ? "Parcours antérieur (Licence)" : "Parcours scolaire antérieur",
    description: cycle === "MASTER"
      ? "Établissement, année et mention du Licence obtenu."
      : "Établissement d'origine et informations du baccalauréat.",
    fields: cycle === "MASTER"
      ? ["previousEstablishment", "licenceYear", "mention", "previousProgram", "previousLevel"]
      : ["previousEstablishment", "bacYear", "bacSeries", "bacCenter"],
  },
  ...(cycle === "LICENCE" ? [{
    title: "Famille & répondant",
    description: "Coordonnées des parents et du répondant à Mahajanga.",
    fields: ["fatherName", "motherName", "parentsPhone", "parentsCity", "respondentName", "respondentPhone", "respondentAddress"] as (keyof StudentForm)[],
  }] : []),
  {
    title: "Parcours universitaire",
    description: cycle === "MASTER" ? "Choix du parcours en Master." : "Choix du parcours en Licence.",
    fields: [],
  },
  {
    title: "Dépôt de dossier",
    description: "Téléversez les pièces justificatives requises pour ce dossier.",
    fields: [],
  },
];
type DocumentType = { type: string; label: string };
type DocumentRequirement = { id: string; establishment: string; cycle: Cycle; type: string; label: string; active: boolean };
const LICENCE_DOCUMENT_TYPES: DocumentType[] = [
  { type: "photo", label: "Photo d'identité (4×4)" },
  { type: "carte_etudiant", label: "Photocopie de l'ancienne carte d'étudiant" },
  { type: "lettre_engagement", label: "Lettre d'engagement (légalisée)" },
  { type: "certificat_residence", label: "Certificat de résidence du répondant" },
  { type: "recu_versement", label: "Reçu de versement" },
];
const MASTER_DOCUMENT_TYPES: DocumentType[] = [
  { type: "photo", label: "Photo d'identité (4×4)" },
  { type: "certificat_residence", label: "Certificat de résidence des parents" },
  { type: "diplome_licence", label: "Photocopie certifiée du diplôme/attestation de Licence" },
  { type: "acte_naissance", label: "Acte de naissance (moins de 3 mois)" },
  { type: "cin", label: "Photocopie CIN légalisée" },
  { type: "recu_versement", label: "Reçu de versement" },
];
type AttestationData = {
  fullName: string;
  birthDatePlace: string;
  program: string;
  level: string;
  registrationNumber: string;
  phone: string;
  email: string;
};

export default function EstablishmentPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const isEstablishmentAdmin =
    userRole === "ADMIN_ETABLISSEMENT" || userRole === "ETABLISSEMENT";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [settings, setSettings] = useInterfaceSettings("etablissement");
  const [view, setView] = useState<View>("students");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [settingsTabId, setSettingsTabId] = useState<"appearance" | "behavior" | "academic" | "documentsInscription" | "documentsCandidature">("appearance");
  const [students, setStudents] = useState<Student[]>([]);
  const [curriculum, setCurriculum] = useState<Curriculum>({
    levels: [],
    programs: [],
  });
  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>([]);
  const [newDocumentRequirement, setNewDocumentRequirement] = useState({ cycle: "LICENCE" as Cycle, label: "" });
  const [candidatureDocumentRequirements, setCandidatureDocumentRequirements] = useState<DocumentRequirement[]>([]);
  const [newCandidatureDocumentRequirement, setNewCandidatureDocumentRequirement] = useState({ label: "" });
  const [editingRequirement, setEditingRequirement] = useState<{ id: string; label: string } | null>(null);
  const [editingCandidatureRequirement, setEditingCandidatureRequirement] = useState<{ id: string; label: string } | null>(null);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newOption, setNewOption] = useState({
    type: "NIVEAU" as Option["type"],
    name: "",
    cycle: "LICENCE" as Cycle,
  });
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [studentForm, setStudentForm] = useState<StudentForm>({
    fullName: "",
    email: "",
    phone: "",
    gender: "FEMININ",
    registrationForm: "LICENCE",
    level: "",
    program: "",
    birthDatePlace: "", cin: "", nationality: "", address: "", previousEstablishment: "",
    bacYear: "", bacSeries: "", bacCenter: "", previousUniversityRegistration: "NON",
    fatherName: "", motherName: "", parentsPhone: "", parentsCity: "", respondentName: "",
    respondentPhone: "", respondentAddress: "", maritalStatus: "", licenceYear: "", mention: "", previousLevel: "",
    previousProgram: "", quality: "",
  });
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>("NEW");
  const [enrollmentCycle, setEnrollmentCycle] = useState<Cycle>("LICENCE");
  const [formStep, setFormStep] = useState(0);
  const [existingStudentId, setExistingStudentId] = useState("");
  const [existingStudentSearch, setExistingStudentSearch] = useState("");
  const [secretaryForm, setSecretaryForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [establishmentMention, setEstablishmentMention] = useState("");
  const [attestation, setAttestation] = useState<AttestationData | null>(null);
  const [pendingAttestation, setPendingAttestation] = useState<AttestationData | null>(null);
  const [uploadStudentId, setUploadStudentId] = useState<string | null>(null);
  const [uploadCycle, setUploadCycle] = useState<Cycle>("LICENCE");
  const [uploadedDocTypes, setUploadedDocTypes] = useState<Set<string>>(new Set());
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const request = (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set(
      "Authorization",
      `Bearer ${sessionStorage.getItem("auth_token") ?? ""}`,
    );
    return fetch(`${apiUrl}${path}`, { ...options, headers });
  };
  const errorMessage = async (response: Response) => {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    return Array.isArray(body.message)
      ? body.message[0]
      : (body.message ?? "Une erreur est survenue.");
  };
  const load = async () => {
    if (
      !sessionStorage.getItem("auth_token") ||
      !["ETABLISSEMENT", "ADMIN_ETABLISSEMENT", "SECRETAIRE"].includes(
        sessionStorage.getItem("user_role") ?? "",
      )
    ) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    const [studentResponse, curriculumResponse, settingsResponse, documentRequirementsResponse, candidatureDocumentRequirementsResponse] = await Promise.all([
      request("/establishment/isstm/students"),
      request("/establishment/isstm/curriculum"),
      request("/establishment/isstm/settings"),
      request("/establishment/isstm/document-requirements?context=INSCRIPTION"),
      request("/establishment/isstm/document-requirements?context=CANDIDATURE"),
    ]);
    if (studentResponse.status === 401 || curriculumResponse.status === 401) {
      sessionStorage.clear();
      router.replace("/login");
      return;
    }
    if (studentResponse.ok)
      setStudents((await studentResponse.json()) as Student[]);
    if (curriculumResponse.ok) {
      setCurriculum((await curriculumResponse.json()) as Curriculum);
    }
    if (settingsResponse.ok) {
      const result = (await settingsResponse.json()) as { mention: string };
      setEstablishmentMention(result.mention);
    }
    if (documentRequirementsResponse.ok) {
      setDocumentRequirements((await documentRequirementsResponse.json()) as DocumentRequirement[]);
    }
    if (candidatureDocumentRequirementsResponse.ok) {
      setCandidatureDocumentRequirements((await candidatureDocumentRequirementsResponse.json()) as DocumentRequirement[]);
    }
    if (
      ["ETABLISSEMENT", "ADMIN_ETABLISSEMENT"].includes(
        sessionStorage.getItem("user_role") ?? "",
      )
    ) {
      const secretaryResponse = await request(
        "/establishment/isstm/secretaries",
      );
      if (secretaryResponse.ok)
        setSecretaries((await secretaryResponse.json()) as Secretary[]);
    }
    if (!studentResponse.ok || !curriculumResponse.ok)
      setMessage("Impossible de charger les données ISSTM.");
    setLoading(false);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUserRole(sessionStorage.getItem("user_role"));
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeLevels = curriculum.levels.filter((item) => item.active);
  const activePrograms = curriculum.programs.filter((item) => item.active);
  const l1Level = activeLevels.find((item) => /licence\s*1|\bl1\b/i.test(item.name));
  const m1Level = activeLevels.find((item) => /master\s*1|\bm1\b/i.test(item.name));
  const licenceLevels = activeLevels.filter((item) => item.cycle === "LICENCE");
  const licenceLevelName = studentForm.level || l1Level?.name || licenceLevels[0]?.name || "";
  const licencePrograms = activePrograms.filter((item) => item.cycle === "LICENCE");
  const masterPrograms = activePrograms.filter((item) => item.cycle === "MASTER");
  const renewalLevel = activeLevels.find((item) => item.name === studentForm.level);
  const renewalPrograms = renewalLevel?.cycle === "MASTER" ? masterPrograms : licencePrograms;
  const shownStudents = useMemo(() => {
    const term = search.toLowerCase();
    return students.filter((item) =>
      `${item.registrationNumber} ${item.fullName} ${item.email ?? ""} ${item.level} ${item.program}`
        .toLowerCase()
        .includes(term),
    );
  }, [students, search]);
  const renewalCandidates = useMemo(() => {
    const term = existingStudentSearch.trim().toLowerCase();
    if (!term) return [];
    return students.filter((student) =>
      `${student.registrationNumber} ${student.fullName} ${student.email ?? ""}`
        .toLowerCase()
        .includes(term),
    ).slice(0, 8);
  }, [students, existingStudentSearch]);
  const eligibleIds = shownStudents
    .filter((item) => item.active && !item.quitus)
    .map((item) => item.id);
  const allSelected =
    eligibleIds.length > 0 &&
    eligibleIds.every((id) => selectedIds.includes(id));

  const generateQuitus = async (studentIds: string[]) => {
    if (!studentIds.length)
      return setMessage("Sélectionnez au moins un étudiant sans quitus.");
    setSaving(true);
    setMessage("");
    const response = await request("/establishment/isstm/quitus/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds }),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      const result = (await response.json()) as { created: number };
      setMessage(`${result.created} quitus généré(s).`);
      setSelectedIds([]);
      await load();
    }
    setSaving(false);
  };
  const selectRenewalCandidate = (student: Student) => {
    setExistingStudentId(student.id);
    setExistingStudentSearch(`${student.registrationNumber} · ${student.fullName}`);
    setStudentForm((current) => ({
      ...current,
      program: "",
      quality: "PASSANT",
      phone: student.phone,
      address: student.address ?? "",
      cin: student.cin ?? "",
      nationality: student.nationality ?? "",
      birthDatePlace: student.birthDatePlace ?? "",
    }));
  };
  const enrollmentSteps = enrollmentMode === "NEW" ? getEnrollmentSteps(enrollmentCycle) : null;
  const familyStepIndex = enrollmentCycle === "LICENCE" ? 3 : -1;
  const programStepIndex = enrollmentSteps ? enrollmentSteps.length - 2 : -1;
  const finalStepIndex = enrollmentSteps ? enrollmentSteps.length - 1 : -1;
  const activeDocumentTypes = (cycle: Cycle): DocumentType[] => {
    const configured = documentRequirements
      .filter((item) => item.cycle === cycle && item.active)
      .map((item) => ({ type: item.type, label: item.label }));
    return configured.length ? configured : (cycle === "MASTER" ? MASTER_DOCUMENT_TYPES : LICENCE_DOCUMENT_TYPES);
  };
  const goToNextStep = () => {
    if (!enrollmentSteps) return;
    const missingField = enrollmentSteps[formStep].fields.find((field) => !String(studentForm[field]).trim());
    if (missingField) {
      setMessage("Veuillez remplir tous les champs obligatoires avant de continuer.");
      return;
    }
    setMessage("");
    setFormStep((step) => Math.min(step + 1, enrollmentSteps.length - 1));
  };
  const goToPreviousStep = () => {
    setMessage("");
    setFormStep((step) => Math.max(step - 1, 0));
  };
  const addStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enrollmentMode === "RENEWAL" && !existingStudentId) {
      setMessage("Recherchez et sélectionnez le dossier existant de l’étudiant.");
      return;
    }
    if (!studentForm.program) {
      setMessage("Sélectionnez un parcours.");
      return;
    }
    const level = enrollmentMode === "NEW" ? (enrollmentCycle === "MASTER" ? m1Level?.name : licenceLevelName) : studentForm.level;
    const cycle: Cycle = enrollmentMode === "NEW" ? enrollmentCycle : (renewalLevel?.cycle ?? "LICENCE");
    if (!level) {
      setMessage("Le niveau correspondant n’est pas configuré dans Paramètres.");
      return;
    }
    const registrationForm = cycle === "MASTER" ? "MASTER" : "LICENCE";
    setSaving(true);
    setMessage("");
    const response = await request("/establishment/isstm/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(enrollmentMode === "RENEWAL" ? {
          existingStudentId,
          registrationForm,
          level,
          program: studentForm.program,
          quality: studentForm.quality || undefined,
          phone: studentForm.phone || undefined,
          address: studentForm.address,
          cin: studentForm.cin,
          nationality: studentForm.nationality,
          birthDatePlace: studentForm.birthDatePlace,
        } : {
          ...studentForm,
          level,
          registrationForm,
          quality: undefined,
          previousUniversityRegistration:
            studentForm.previousUniversityRegistration === "OUI",
        }),
      }),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      const created = (await response.json()) as Student;
      setMessage("Étudiant ajouté dans la base ISSTM.");
      setPendingAttestation({
        fullName: created.fullName,
        birthDatePlace: created.birthDatePlace ?? studentForm.birthDatePlace,
        program: created.program,
        level: created.level,
        registrationNumber: created.registrationNumber,
        phone: created.phone,
        email: created.email ?? studentForm.email,
      });
      setUploadStudentId(created.id);
      setUploadCycle(cycle);
      setUploadedDocTypes(new Set());
      if (enrollmentMode === "NEW" && enrollmentSteps) setFormStep(enrollmentSteps.length - 1);
    }
    setSaving(false);
  };
  const finishDossier = () => {
    setAttestation(pendingAttestation);
    setPendingAttestation(null);
    setUploadStudentId(null);
    setUploadedDocTypes(new Set());
    setStudentForm((current) => ({
      ...current,
      fullName: "", email: "", phone: "", program: "", quality: "",
      birthDatePlace: "", cin: "", nationality: "", address: "", previousEstablishment: "",
      bacYear: "", bacSeries: "", bacCenter: "", previousUniversityRegistration: "NON",
      fatherName: "", motherName: "", parentsPhone: "", parentsCity: "", respondentName: "",
      respondentPhone: "", respondentAddress: "", maritalStatus: "", licenceYear: "",
      mention: "", previousLevel: "", previousProgram: "",
    }));
    setEnrollmentMode("NEW");
    setEnrollmentCycle("LICENCE");
    setFormStep(0);
    setExistingStudentId("");
    setExistingStudentSearch("");
    setView("students");
    void load();
  };
  const handleDocumentUpload = async (type: string, file: File) => {
    if (!uploadStudentId) return;
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage("Format accepté : PDF, PNG ou JPG (10 Mo maximum).");
      return;
    }
    setUploadingType(type);
    const formData = new FormData();
    formData.append("file", file);
    const response = await request(`/establishment/isstm/students/${uploadStudentId}/documents/${type}`, { method: "POST", body: formData });
    if (!response.ok) setMessage(await errorMessage(response));
    else setUploadedDocTypes((current) => new Set(current).add(type));
    setUploadingType(null);
  };
  const addSecretary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await request("/establishment/isstm/secretaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(secretaryForm),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setSecretaryForm({ fullName: "", email: "", password: "" });
      setMessage("Compte secrétaire créé.");
      await load();
    }
    setSaving(false);
  };
  const updateSecretaryStatus = async (secretary: Secretary) => {
    setSaving(true);
    setMessage("");
    const response = await request(
      `/establishment/isstm/secretaries/${secretary.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !secretary.active }),
      },
    );
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setMessage(`Compte ${secretary.active ? "désactivé" : "activé"}.`);
      await load();
    }
    setSaving(false);
  };
  const updateSecretary = async (
    id: string,
    values: { fullName: string; password: string },
  ) => {
    setSaving(true);
    setMessage("");
    const body = {
      fullName: values.fullName,
      ...(values.password ? { password: values.password } : {}),
    };
    const response = await request(`/establishment/isstm/secretaries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setMessage("Compte secrétaire modifié.");
      await load();
    }
    setSaving(false);
  };
  const createOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await request("/establishment/isstm/curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOption),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setNewOption({ type: newOption.type, name: "", cycle: newOption.cycle });
      await load();
    }
    setSaving(false);
  };
  const updateOption = async (
    option: Option,
    patch: { name?: string; active?: boolean; cycle?: Cycle },
  ) => {
    setSaving(true);
    setMessage("");
    const response = await request(
      `/establishment/isstm/curriculum/${option.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setEditing(null);
      await load();
    }
    setSaving(false);
  };
  const saveMention = async () => {
    setSaving(true);
    setMessage("");
    const response = await request("/establishment/isstm/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mention: establishmentMention }),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else setMessage("Mention enregistrée.");
    setSaving(false);
  };
  const deleteOption = async (option: Option) => {
    if (!window.confirm(`Supprimer « ${option.name} » ?`)) return;
    setSaving(true);
    const response = await request(
      `/establishment/isstm/curriculum/${option.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) setMessage(await errorMessage(response));
    else await load();
    setSaving(false);
  };
  const createDocumentRequirement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newDocumentRequirement.label.trim()) { setMessage("Le libellé de la pièce est obligatoire."); return; }
    setSaving(true);
    setMessage("");
    const response = await request("/establishment/isstm/document-requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDocumentRequirement),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setNewDocumentRequirement({ cycle: newDocumentRequirement.cycle, label: "" });
      await load();
    }
    setSaving(false);
  };
  const updateDocumentRequirement = async (requirement: DocumentRequirement, patch: { label?: string; active?: boolean; cycle?: Cycle }) => {
    setSaving(true);
    setMessage("");
    const response = await request(`/establishment/isstm/document-requirements/${requirement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setEditingRequirement(null);
      await load();
    }
    setSaving(false);
  };
  const deleteDocumentRequirement = async (requirement: DocumentRequirement) => {
    if (!window.confirm(`Supprimer « ${requirement.label} » ?`)) return;
    setSaving(true);
    const response = await request(`/establishment/isstm/document-requirements/${requirement.id}`, { method: "DELETE" });
    if (!response.ok) setMessage(await errorMessage(response));
    else await load();
    setSaving(false);
  };
  const createCandidatureDocumentRequirement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCandidatureDocumentRequirement.label.trim()) { setMessage("Le libellé de la pièce est obligatoire."); return; }
    setSaving(true);
    setMessage("");
    const response = await request("/establishment/isstm/document-requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCandidatureDocumentRequirement, context: "CANDIDATURE" }),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setNewCandidatureDocumentRequirement({ label: "" });
      await load();
    }
    setSaving(false);
  };
  const updateCandidatureDocumentRequirement = async (requirement: DocumentRequirement, patch: { label?: string; active?: boolean }) => {
    setSaving(true);
    setMessage("");
    const response = await request(`/establishment/isstm/document-requirements/${requirement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) setMessage(await errorMessage(response));
    else {
      setEditingCandidatureRequirement(null);
      await load();
    }
    setSaving(false);
  };
  const deleteCandidatureDocumentRequirement = async (requirement: DocumentRequirement) => {
    if (!window.confirm(`Supprimer « ${requirement.label} » ?`)) return;
    setSaving(true);
    const response = await request(`/establishment/isstm/document-requirements/${requirement.id}`, { method: "DELETE" });
    if (!response.ok) setMessage(await errorMessage(response));
    else await load();
    setSaving(false);
  };

  const navigation: { id: View; label: string; icon: typeof List }[] = [
    { id: "students", label: "Liste des étudiants", icon: List },
    ...(isEstablishmentAdmin
      ? [
          {
            id: "secretaries" as View,
            label: "Ajouter secrétaire",
            icon: Users,
          },
        ]
      : []),
  ];
  const settingsSections: { id: typeof settingsTabId; label: string; icon: typeof Palette }[] = [
    { id: "appearance", label: "Apparence & Affichage", icon: Palette },
    { id: "behavior", label: "Comportement", icon: SlidersHorizontal },
    { id: "academic", label: "Structure académique & mentions", icon: Building2 },
    { id: "documentsInscription", label: "Pièces — Inscription", icon: FileText },
    { id: "documentsCandidature", label: "Pièces — Dépôt de dossier étudiant", icon: FileText },
  ];
  const addSections: { mode: EnrollmentMode; label: string; icon: typeof UserPlus }[] = [
    { mode: "NEW", label: "Nouvelle inscription", icon: UserPlus },
    { mode: "RENEWAL", label: "Réinscription", icon: UserPlus },
  ];
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {sidebarOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/70 min-[1025px]:hidden"
        />
      )}
      {/* Barre latérale : cachée sous 1025px, ouverte via le bouton menu */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col justify-between overflow-y-auto border-r border-slate-800 bg-slate-900 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} min-[1025px]:translate-x-0`}
      >
        <div>
          <div className="flex items-center gap-3 border-b border-slate-800 p-5 sm:p-6">
            <div className="shrink-0 rounded-2xl bg-blue-600 p-2.5">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <b className="block truncate">Univ Mahajanga</b>
              <span className="block truncate text-[10px] uppercase tracking-wider text-blue-400">
                Espace établissement
              </span>
            </div>
            <button
              aria-label="Fermer le menu"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 min-[1025px]:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="m-3 flex gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
            <Building2 className="shrink-0 text-blue-400" />
            <div className="min-w-0">
              <b className="text-sm">ISSTM</b>
              <p className="text-xs text-slate-400">
                Gestion de l&apos;établissement
              </p>
            </div>
          </div>
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-bold ${view === item.id ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
            <div>
              <button
                onClick={() => {
                  setAddMenuOpen((open) => !open);
                  if (view !== "add") setView("add");
                }}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-bold ${view === "add" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                Ajouter un étudiant
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${addMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {addMenuOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {addSections.map((section) => {
                    const Icon = section.icon;
                    const active = view === "add" && enrollmentMode === section.mode;
                    return (
                      <button
                        key={section.mode}
                        onClick={() => {
                          setView("add");
                          setEnrollmentMode(section.mode);
                          setFormStep(0);
                          setUploadStudentId(null);
                          setUploadedDocTypes(new Set());
                          if (section.mode !== "RENEWAL") { setExistingStudentId(""); setExistingStudentSearch(""); }
                          if (section.mode === "NEW") {
                            setEnrollmentCycle("LICENCE");
                            setStudentForm((current) => ({ ...current, level: l1Level?.name ?? licenceLevels[0]?.name ?? "" }));
                          }
                          setSidebarOpen(false);
                        }}
                        className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-semibold ${active ? "bg-blue-600/20 text-blue-300" : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => {
                  setSettingsMenuOpen((open) => !open);
                  if (view !== "settings") setView("settings");
                }}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-bold ${view === "settings" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                Paramètres
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${settingsMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {settingsMenuOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {settingsSections.map((section) => {
                    const Icon = section.icon;
                    const active = view === "settings" && settingsTabId === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          setView("settings");
                          setSettingsTabId(section.id);
                          setSidebarOpen(false);
                        }}
                        className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-semibold ${active ? "bg-blue-600/20 text-blue-300" : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
        <button
          onClick={() => setLogoutConfirmOpen(true)}
          className="m-4 flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </aside>
      {/* Contenu : marge gauche = largeur exacte de la barre latérale (w-72) */}
      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 min-[1025px]:ml-72 min-[1025px]:w-auto min-[1025px]:p-8">
        <header className="mb-5 flex items-center gap-3 sm:mb-6">
          <button
            aria-label="Ouvrir le menu"
            onClick={() => setSidebarOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 min-[1025px]:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold sm:text-xl">
              {view === "students"
                ? "Liste des étudiants"
                : view === "add"
                  ? "Ajouter un étudiant"
                  : view === "secretaries"
                    ? "Comptes secrétaires"
                    : "Paramètres ISSTM"}
            </h1>
            <p className="truncate text-xs text-slate-400">
              Niveaux et parcours propres à l&apos;ISSTM
            </p>
          </div>
          <button
            aria-label="Actualiser"
            onClick={() => void load()}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-800 px-3.5 text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </header>
        {message && (
          <p className="mb-5 break-words rounded-xl bg-blue-500/10 p-3 text-xs text-blue-200">
            {message}
          </p>
        )}
        {view === "students" && (
          <StudentsView
            students={shownStudents}
            loading={loading}
            search={search}
            setSearch={setSearch}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            eligibleIds={eligibleIds}
            allSelected={allSelected}
            generateQuitus={generateQuitus}
            saving={saving}
            viewDossier={setDossierStudentId}
          />
        )}
        {view === "add" && (
          <form
            onSubmit={(event) => void addStudent(event)}
            className="w-full space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6"
          >
            <p className="text-sm font-bold text-white">
              {enrollmentMode === "NEW" ? (enrollmentCycle === "MASTER" ? "Inscription en M1" : "Inscription Licence") : "Réinscription"}
            </p>

            {enrollmentMode === "RENEWAL" && uploadStudentId && (
              <DossierUploadPanel
                documentTypes={activeDocumentTypes(uploadCycle)}
                uploadedTypes={uploadedDocTypes}
                uploadingType={uploadingType}
                onUpload={handleDocumentUpload}
                onFinish={finishDossier}
              />
            )}
            {enrollmentMode === "RENEWAL" && !uploadStudentId && <div className="space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <label className="block text-xs font-semibold text-slate-300">Rechercher par matricule, nom ou e-mail
                <input value={existingStudentSearch} onChange={(event) => { setExistingStudentSearch(event.target.value); setExistingStudentId(""); }} placeholder="Ex. ISSTM-2026-001 ou RAKOTO" className="AccountInput mt-2 w-full text-base sm:text-sm" />
              </label>
              {renewalCandidates.map((student) => <button key={student.id} type="button" onClick={() => selectRenewalCandidate(student)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-xs ${existingStudentId === student.id ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-700 bg-slate-950/60"}`}><span className="min-w-0"><b className="block break-words text-white">{student.fullName}</b><span className="text-slate-400">{student.registrationNumber} · {student.email ?? "Sans e-mail"}</span></span><span className="shrink-0 text-slate-400">{student.level}</span></button>)}
              {existingStudentSearch && !renewalCandidates.length && <p className="text-xs text-amber-300">Aucun dossier trouvé. Vérifiez le matricule ou le nom.</p>}
              {existingStudentId && <>
                <p className="text-xs text-emerald-300">Dossier sélectionné. Vérifiez et complétez les informations ci-dessous.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Qualité" value={studentForm.quality || "PASSANT"} onChange={(value) => setStudentForm({ ...studentForm, quality: value as StudentForm["quality"] })} options={["PASSANT", "REDOUBLANT"]} />
                  <Select label="Nouveau niveau" value={studentForm.level} onChange={(value) => setStudentForm({ ...studentForm, level: value, program: "" })} options={activeLevels.map((item) => item.name)} />
                </div>
                <ProgramPicker programs={renewalPrograms} value={studentForm.program} onChange={(name) => setStudentForm({ ...studentForm, program: name })} />
                <div className="grid gap-4 border-t border-slate-800 pt-4 sm:grid-cols-2">
                  <Input label="Téléphone" value={studentForm.phone} onChange={(value) => setStudentForm({ ...studentForm, phone: value })} placeholder="034 00 000 00" />
                  <Input label="CIN (ou Passeport)" value={studentForm.cin} onChange={(value) => setStudentForm({ ...studentForm, cin: value })} placeholder="Numéro CIN" />
                  <Input label="Nationalité" value={studentForm.nationality} onChange={(value) => setStudentForm({ ...studentForm, nationality: value })} placeholder="Malagasy" />
                  <Input label="Date et lieu de naissance" value={studentForm.birthDatePlace} onChange={(value) => setStudentForm({ ...studentForm, birthDatePlace: value })} placeholder="JJ/MM/AAAA à Mahajanga" />
                  <Input className="sm:col-span-2" label="Adresse exacte" value={studentForm.address} onChange={(value) => setStudentForm({ ...studentForm, address: value })} placeholder="Adresse de l'étudiant" />
                </div>
                <button disabled={saving || !studentForm.program} className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold disabled:opacity-50 sm:w-auto ${touch}`}>
                  <UserPlus className="mr-2 inline h-4 w-4" />{saving ? "Enregistrement…" : "Réinscrire cet étudiant"}
                </button>
              </>}
            </div>}

            {enrollmentMode === "NEW" && enrollmentSteps && <>
              <p className="text-sm text-slate-400">
                {enrollmentCycle === "MASTER" ? "Fiche d'inscription en Master 1 (M1)." : "Fiche d'inscription en Licence. Le matricule sera attribué automatiquement."}
              </p>
              <StepProgress steps={enrollmentSteps} current={formStep} />
              {formStep === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Cycle d'inscription"
                    value={enrollmentCycle}
                    onChange={(value) => {
                      const nextCycle = value as Cycle;
                      setEnrollmentCycle(nextCycle);
                      setStudentForm((current) => ({
                        ...current,
                        level: nextCycle === "MASTER" ? (m1Level?.name ?? "") : (l1Level?.name ?? licenceLevels[0]?.name ?? ""),
                        program: "",
                      }));
                    }}
                    options={["LICENCE", "MASTER"]}
                  />
                </div>
              )}
              {formStep === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {enrollmentCycle === "LICENCE" && (
                    <Select label="Niveau d'inscription" value={licenceLevelName} onChange={(value) => setStudentForm({ ...studentForm, level: value })} options={licenceLevels.map((item) => item.name)} />
                  )}
                  <Input label={enrollmentCycle === "MASTER" ? "Nom et Prénoms" : "Nom et Prénom"} value={studentForm.fullName} onChange={(value) => setStudentForm({ ...studentForm, fullName: value })} placeholder="RAKOTO Jean" />
                  <Select label="Sexe" value={studentForm.gender} onChange={(value) => setStudentForm({ ...studentForm, gender: value as StudentForm["gender"] })} options={["FEMININ", "MASCULIN", "AUTRE"]} />
                  <Input label="Date et lieu de naissance" value={studentForm.birthDatePlace} onChange={(value) => setStudentForm({ ...studentForm, birthDatePlace: value })} placeholder="JJ/MM/AAAA à Mahajanga" />
                  {enrollmentCycle === "MASTER" ? (
                    <Input label="Situation matrimoniale" value={studentForm.maritalStatus} onChange={(value) => setStudentForm({ ...studentForm, maritalStatus: value })} placeholder="Célibataire" />
                  ) : (
                    <Input label="CIN" value={studentForm.cin} onChange={(value) => setStudentForm({ ...studentForm, cin: value })} placeholder="Numéro CIN" />
                  )}
                  <Input label="Nationalité" value={studentForm.nationality} onChange={(value) => setStudentForm({ ...studentForm, nationality: value })} placeholder="Malagasy" />
                  <Input label={enrollmentCycle === "MASTER" ? "Adresse de l'étudiant(e)" : "Adresse exacte de l'étudiant"} value={studentForm.address} onChange={(value) => setStudentForm({ ...studentForm, address: value })} placeholder="Adresse de l'étudiant" />
                  <Input label="Téléphone" value={studentForm.phone} onChange={(value) => setStudentForm({ ...studentForm, phone: value })} placeholder="034 00 000 00" />
                  <Input label="E-mail" type="email" value={studentForm.email} onChange={(value) => setStudentForm({ ...studentForm, email: value })} placeholder="jean@isstm.mg" />
                </div>
              )}
              {formStep === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Établissement d'origine" value={studentForm.previousEstablishment} onChange={(value) => setStudentForm({ ...studentForm, previousEstablishment: value })} placeholder="Établissement précédent" />
                  {enrollmentCycle === "MASTER" ? (
                    <>
                      <Input label="Année du Licence" value={studentForm.licenceYear} onChange={(value) => setStudentForm({ ...studentForm, licenceYear: value })} placeholder="2025" />
                      <Input label="Mention" value={studentForm.mention} onChange={(value) => setStudentForm({ ...studentForm, mention: value })} placeholder="Mention" />
                      <Input label="Parcours antérieur (Licence)" value={studentForm.previousProgram} onChange={(value) => setStudentForm({ ...studentForm, previousProgram: value })} placeholder="Ex. GInfo" />
                      <Input label="Niveau de l'année précédente" value={studentForm.previousLevel} onChange={(value) => setStudentForm({ ...studentForm, previousLevel: value })} placeholder="Licence 3" />
                    </>
                  ) : (
                    <>
                      <Input label="Année du baccalauréat" value={studentForm.bacYear} onChange={(value) => setStudentForm({ ...studentForm, bacYear: value })} placeholder="2022" />
                      <Input label="Série du baccalauréat" value={studentForm.bacSeries} onChange={(value) => setStudentForm({ ...studentForm, bacSeries: value })} placeholder="Série" />
                      <Input label="Centre" value={studentForm.bacCenter} onChange={(value) => setStudentForm({ ...studentForm, bacCenter: value })} placeholder="Centre" />
                      <Select label="Inscription antérieure à l'université" value={studentForm.previousUniversityRegistration} onChange={(value) => setStudentForm({ ...studentForm, previousUniversityRegistration: value })} options={["OUI", "NON"]} />
                    </>
                  )}
                </div>
              )}
              {enrollmentCycle === "LICENCE" && formStep === familyStepIndex && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Nom du père" value={studentForm.fatherName} onChange={(value) => setStudentForm({ ...studentForm, fatherName: value })} placeholder="Nom complet" />
                  <Input label="Nom de la mère" value={studentForm.motherName} onChange={(value) => setStudentForm({ ...studentForm, motherName: value })} placeholder="Nom complet" />
                  <Input label="Téléphone des parents" value={studentForm.parentsPhone} onChange={(value) => setStudentForm({ ...studentForm, parentsPhone: value })} placeholder="Téléphone" />
                  <Input label="Ville des parents" value={studentForm.parentsCity} onChange={(value) => setStudentForm({ ...studentForm, parentsCity: value })} placeholder="Ville" />
                  <Input label="Nom du répondant à Mahajanga" value={studentForm.respondentName} onChange={(value) => setStudentForm({ ...studentForm, respondentName: value })} placeholder="Nom complet" />
                  <Input label="Téléphone du répondant" value={studentForm.respondentPhone} onChange={(value) => setStudentForm({ ...studentForm, respondentPhone: value })} placeholder="Téléphone" />
                  <Input className="sm:col-span-2" label="Adresse exacte du répondant" value={studentForm.respondentAddress} onChange={(value) => setStudentForm({ ...studentForm, respondentAddress: value })} placeholder="Adresse à Mahajanga" />
                </div>
              )}
              {formStep === programStepIndex && (
                <ProgramPicker programs={enrollmentCycle === "MASTER" ? masterPrograms : licencePrograms} value={studentForm.program} onChange={(name) => setStudentForm({ ...studentForm, program: name })} />
              )}
              {formStep === finalStepIndex ? (
                <DossierUploadPanel
                  documentTypes={activeDocumentTypes(enrollmentCycle)}
                  uploadedTypes={uploadedDocTypes}
                  uploadingType={uploadingType}
                  onUpload={handleDocumentUpload}
                  onFinish={finishDossier}
                />
              ) : (
                <StepNav
                  step={formStep}
                  totalSteps={enrollmentSteps.length - 1}
                  onPrevious={goToPreviousStep}
                  onNext={goToNextStep}
                  submitDisabled={saving || (enrollmentCycle === "MASTER" ? (!m1Level || !masterPrograms.length) : (!licenceLevelName || !licencePrograms.length))}
                  submitLabel={saving ? "Ajout…" : "Ajouter dans la base ISSTM"}
                />
              )}
            </>}
          </form>
        )}
        {view === "secretaries" && (
          <SecretaryManagement
            secretaries={secretaries}
            form={secretaryForm}
            setForm={setSecretaryForm}
            onSubmit={addSecretary}
            saving={saving}
            updateStatus={updateSecretaryStatus}
            updateSecretary={updateSecretary}
          />
        )}
        {view === "settings" && (
          <section className="w-full">
            <AdminSettingsPanel
              settings={settings}
              onChange={setSettings}
              identity={false}
              tabbed
              hideNav
              activeTabId={settingsTabId}
              extraTabs={[
                {
                  id: "academic",
                  label: "Structure académique & mentions",
                  icon: <Building2 className="h-4 w-4" />,
                  content: (
                    <div className="space-y-4 sm:space-y-6">
                      {isEstablishmentAdmin && (
                        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                          <h2 className="mb-1 font-bold text-white">Mention de l&apos;établissement</h2>
                          <p className="mb-4 text-xs text-slate-400">Affichée sur les attestations d&apos;inscription générées.</p>
                          <div className="flex flex-wrap items-end gap-3">
                            <Input
                              className="w-full sm:w-auto sm:flex-1"
                              label="Mention"
                              value={establishmentMention}
                              onChange={setEstablishmentMention}
                              placeholder="Ex. Sciences et Techniques du Numérique et Physiques appliquées"
                            />
                            <button
                              type="button"
                              onClick={() => void saveMention()}
                              disabled={saving}
                              className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold disabled:opacity-50 sm:w-auto ${touch}`}
                            >
                              Enregistrer
                            </button>
                          </div>
                        </section>
                      )}
                      <form
                        onSubmit={(event) => void createOption(event)}
                        className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
                      >
                        <Select
                          className="w-full sm:w-auto"
                          label="Type"
                          value={newOption.type}
                          onChange={(value) =>
                            setNewOption({ ...newOption, type: value as Option["type"] })
                          }
                          options={["NIVEAU", "PARCOURS"]}
                        />
                        <Select
                          className="w-full sm:w-auto"
                          label="Cycle"
                          value={newOption.cycle}
                          onChange={(value) => setNewOption({ ...newOption, cycle: value as Cycle })}
                          options={["LICENCE", "MASTER"]}
                        />
                        <Input
                          className="w-full sm:w-auto"
                          label="Nouveau niveau ou parcours"
                          value={newOption.name}
                          onChange={(value) =>
                            setNewOption({ ...newOption, name: value })
                          }
                          placeholder="Ex. Master 3"
                        />
                        <button
                          disabled={saving}
                          className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold sm:w-auto ${touch}`}
                        >
                          <Plus className="mr-1 inline h-4 w-4" />
                          Ajouter
                        </button>
                      </form>
                      <Options
                        title="Niveaux ISSTM"
                        icon={<BookOpen className="h-4 w-4" />}
                        options={curriculum.levels}
                        editing={editing}
                        setEditing={setEditing}
                        updateOption={updateOption}
                        deleteOption={deleteOption}
                        saving={saving}
                      />
                      <Options
                        title="Parcours ISSTM"
                        icon={<GraduationCap className="h-4 w-4" />}
                        options={curriculum.programs}
                        editing={editing}
                        setEditing={setEditing}
                        updateOption={updateOption}
                        deleteOption={deleteOption}
                        saving={saving}
                      />
                    </div>
                  ),
                },
                {
                  id: "documentsInscription",
                  label: "Pièces — Inscription",
                  icon: <FileText className="h-4 w-4" />,
                  content: (
                    <div className="space-y-4 sm:space-y-6">
                      <p className="text-xs text-slate-400">
                        Pièces demandées lorsque le secrétariat ajoute ou réinscrit un étudiant (formulaire « Ajouter un étudiant »), séparément pour la Licence et le Master. Chaque pièce peut être activée, désactivée ou supprimée.
                      </p>
                      <form
                        onSubmit={(event) => void createDocumentRequirement(event)}
                        className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
                      >
                        <Select
                          className="w-full sm:w-auto"
                          label="Cycle"
                          value={newDocumentRequirement.cycle}
                          onChange={(value) => setNewDocumentRequirement({ ...newDocumentRequirement, cycle: value as Cycle })}
                          options={["LICENCE", "MASTER"]}
                        />
                        <Input
                          className="w-full sm:w-auto"
                          label="Nouvelle pièce à téléverser"
                          value={newDocumentRequirement.label}
                          onChange={(value) => setNewDocumentRequirement({ ...newDocumentRequirement, label: value })}
                          placeholder="Ex. Certificat médical"
                        />
                        <button
                          disabled={saving}
                          className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold sm:w-auto ${touch}`}
                        >
                          <Plus className="mr-1 inline h-4 w-4" />
                          Ajouter
                        </button>
                      </form>
                      <DocumentRequirementList
                        title="Pièces — Licence"
                        requirements={documentRequirements.filter((item) => item.cycle === "LICENCE")}
                        editing={editingRequirement}
                        setEditing={setEditingRequirement}
                        updateRequirement={updateDocumentRequirement}
                        deleteRequirement={deleteDocumentRequirement}
                        saving={saving}
                      />
                      <DocumentRequirementList
                        title="Pièces — Master"
                        requirements={documentRequirements.filter((item) => item.cycle === "MASTER")}
                        editing={editingRequirement}
                        setEditing={setEditingRequirement}
                        updateRequirement={updateDocumentRequirement}
                        deleteRequirement={deleteDocumentRequirement}
                        saving={saving}
                      />
                    </div>
                  ),
                },
                {
                  id: "documentsCandidature",
                  label: "Pièces — Dépôt de dossier étudiant",
                  icon: <FileText className="h-4 w-4" />,
                  content: (
                    <div className="space-y-4 sm:space-y-6">
                      <p className="text-xs text-slate-400">
                        Pièces demandées à l&apos;étudiant dans son propre espace, à l&apos;étape « Dépôt de dossier » de sa candidature en ligne. Liste unique, sans distinction Licence/Master. Chaque pièce peut être activée, désactivée ou supprimée.
                      </p>
                      <form
                        onSubmit={(event) => void createCandidatureDocumentRequirement(event)}
                        className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
                      >
                        <Input
                          className="w-full sm:w-auto sm:flex-1"
                          label="Nouvelle pièce à téléverser"
                          value={newCandidatureDocumentRequirement.label}
                          onChange={(value) => setNewCandidatureDocumentRequirement({ ...newCandidatureDocumentRequirement, label: value })}
                          placeholder="Ex. Certificat médical"
                        />
                        <button
                          disabled={saving}
                          className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold sm:w-auto ${touch}`}
                        >
                          <Plus className="mr-1 inline h-4 w-4" />
                          Ajouter
                        </button>
                      </form>
                      <DocumentRequirementList
                        title="Pièces obligatoires à fournir"
                        requirements={candidatureDocumentRequirements}
                        editing={editingCandidatureRequirement}
                        setEditing={setEditingCandidatureRequirement}
                        updateRequirement={updateCandidatureDocumentRequirement}
                        deleteRequirement={deleteCandidatureDocumentRequirement}
                        saving={saving}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </section>
        )}
      </main>
      {dossierStudentId && <DossierViewer endpoint={`/establishment/isstm/students/${dossierStudentId}/dossier`} onClose={() => setDossierStudentId(null)} />}
      {attestation && (
        <AttestationView
          data={attestation}
          mention={establishmentMention}
          onClose={() => setAttestation(null)}
        />
      )}
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirmer la déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          sessionStorage.clear();
          router.push("/login");
        }}
      />
    </div>
  );
}

function StudentsView({
  students,
  loading,
  search,
  setSearch,
  selectedIds,
  setSelectedIds,
  eligibleIds,
  allSelected,
  generateQuitus,
  saving,
  viewDossier,
}: {
  students: Student[];
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  selectedIds: string[];
  setSelectedIds: (value: string[]) => void;
  eligibleIds: string[];
  allSelected: boolean;
  generateQuitus: (ids: string[]) => Promise<void>;
  saving: boolean;
  viewDossier: (id: string) => void;
}) {
  const toggleAll = () =>
    setSelectedIds(
      allSelected
        ? selectedIds.filter((id) => !eligibleIds.includes(id))
        : [...new Set([...selectedIds, ...eligibleIds])],
    );
  const toggleOne = (id: string) =>
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  const quitusCell = (item: Student) =>
    item.quitus ? (
      <span className="font-mono text-xs text-emerald-400">
        <CheckCircle2 className="mr-1 inline h-4 w-4" />
        {item.quitus.code}
      </span>
    ) : (
      <span className="text-xs text-amber-400">Non généré</span>
    );
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <label className="relative w-full sm:w-auto sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un étudiant…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 text-base sm:text-sm max-[1024px]:min-h-[44px]"
          />
        </label>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={() => void generateQuitus(eligibleIds)}
            disabled={!eligibleIds.length || saving}
            suppressHydrationWarning
            className={`rounded-xl border border-blue-500/40 px-3 py-2 text-xs text-blue-300 disabled:opacity-50 ${touch}`}
          >
            Générer les manquants
          </button>
          <button
            onClick={() => void generateQuitus(selectedIds)}
            disabled={!selectedIds.length || saving}
            suppressHydrationWarning
            className={`rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold disabled:opacity-50 ${touch}`}
          >
            <FilePlus2 className="mr-1 inline h-4 w-4" />
            Générer la sélection
          </button>
        </div>
      </div>

      {/* Téléphone et tablette : une carte par étudiant */}
      <div className="space-y-3 xl:hidden">
        {!loading && students.length > 0 && (
          <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0"
              checked={allSelected}
              onChange={toggleAll}
            />
            Sélectionner tous les étudiants sans quitus
          </label>
        )}
        {loading ? (
          <p className="p-8 text-center text-sm">Chargement…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {students.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0"
                  disabled={!!item.quitus}
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleOne(item.id)}
                />
                <div className="min-w-0 flex-1">
                  <b className="break-words">{item.fullName}</b>
                  <p className="font-mono text-xs text-slate-400">
                    {item.registrationNumber}
                  </p>
                  <p className="mt-2 break-words">{item.level}</p>
                  <p className="break-words text-xs text-slate-400">
                    {item.program}
                  </p>
                  <p className="mt-2 break-all text-xs text-slate-300">
                    {item.email}
                  </p>
                  <p className="text-xs text-slate-400">{item.phone}</p>
                  <div className="mt-2 break-all">{quitusCell(item)}</div>
                  <button onClick={() => viewDossier(item.id)} className="mt-3 min-h-[44px] w-full rounded-lg border border-blue-500/40 px-3 text-xs font-bold text-blue-300">Voir le dossier</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !students.length && (
          <p className="p-8 text-center text-sm text-slate-500">
            Aucun étudiant trouvé.
          </p>
        )}
      </div>

      {/* Grand écran : tableau */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-[850px] w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs text-slate-500">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-3">Étudiant</th>
              <th className="p-3">Formation</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Quitus</th><th className="p-3">Dossier</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  Chargement…
                </td>
              </tr>
            ) : (
              students.map((item) => (
                <tr key={item.id} className="border-b border-slate-800/70">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      disabled={!!item.quitus}
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td className="p-3">
                    <b>{item.fullName}</b>
                    <p className="font-mono text-xs text-slate-400">
                      {item.registrationNumber}
                    </p>
                  </td>
                  <td className="p-3">
                    {item.level}
                    <p className="text-xs text-slate-400">{item.program}</p>
                  </td>
                  <td className="p-3">
                    {item.email}
                    <p className="text-xs text-slate-400">{item.phone}</p>
                  </td>
                  <td className="p-3">{quitusCell(item)}</td><td className="p-3"><button onClick={() => viewDossier(item.id)} className="min-h-[44px] rounded-lg border border-blue-500/40 px-3 text-xs font-bold text-blue-300">Voir le dossier</button></td>
                </tr>
              ))
            )}
            {!loading && !students.length && (
              <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucun étudiant trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function SecretaryManagement({
  secretaries,
  form,
  setForm,
  onSubmit,
  saving,
  updateStatus,
  updateSecretary,
}: {
  secretaries: Secretary[];
  form: { fullName: string; email: string; password: string };
  setForm: (form: {
    fullName: string;
    email: string;
    password: string;
  }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  updateStatus: (secretary: Secretary) => Promise<void>;
  updateSecretary: (
    id: string,
    values: { fullName: string; password: string },
  ) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", password: "" });
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold">
        <Users className="h-4 w-4" />
        Comptes secrétaires
      </h2>
      <form onSubmit={onSubmit} className="mb-5 grid gap-3 md:grid-cols-3">
        <Input
          label="Nom complet"
          value={form.fullName}
          onChange={(value) => setForm({ ...form, fullName: value })}
          placeholder="Nom du secrétaire"
        />
        <Input
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(value) => setForm({ ...form, email: value })}
          placeholder="secretariat@isstm.mg"
        />
        <Input
          label="Mot de passe"
          type="password"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
          placeholder="8 caractères minimum"
        />
        <button
          disabled={saving}
          className={`rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold md:col-span-3 ${touch}`}
        >
          <UserPlus className="mr-1 inline h-4 w-4" />
          Créer le compte secrétaire
        </button>
      </form>
      <div className="space-y-2">
        {secretaries.map((secretary) => (
          <div
            key={secretary.id}
            className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <b className="break-words">{secretary.fullName}</b>
                <p className="break-all text-xs text-slate-500">
                  {secretary.email}
                </p>
              </div>
              <span
                className={`shrink-0 ${
                  secretary.active ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {secretary.active ? "Actif" : "Désactivé"}
              </span>
            </div>
            {editingId === secretary.id ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateSecretary(secretary.id, editForm).then(() =>
                    setEditingId(null),
                  );
                }}
                className="mt-3 grid gap-2 sm:grid-cols-2"
              >
                <Input
                  label="Nom complet"
                  value={editForm.fullName}
                  onChange={(value) =>
                    setEditForm({ ...editForm, fullName: value })
                  }
                  placeholder="Nom du secrétaire"
                />
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  value={editForm.password}
                  onChange={(value) =>
                    setEditForm({ ...editForm, password: value })
                  }
                  placeholder="Laisser vide pour conserver"
                />
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold sm:flex-none ${touch}`}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className={`flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs sm:flex-none ${touch}`}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setEditingId(secretary.id);
                    setEditForm({ fullName: secretary.fullName, password: "" });
                  }}
                  className={`flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs sm:flex-none ${touch}`}
                >
                  Modifier
                </button>
                <button
                  onClick={() => void updateStatus(secretary)}
                  disabled={saving}
                  className={`flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs sm:flex-none ${touch}`}
                >
                  {secretary.active ? "Désactiver" : "Activer"}
                </button>
              </div>
            )}
          </div>
        ))}
        {!secretaries.length && (
          <p className="text-sm text-slate-500">Aucun compte secrétaire.</p>
        )}
      </div>
    </section>
  );
}

function Options({
  title,
  icon,
  options,
  editing,
  setEditing,
  updateOption,
  deleteOption,
  saving,
}: {
  title: string;
  icon: ReactNode;
  options: Option[];
  editing: { id: string; name: string } | null;
  setEditing: (item: { id: string; name: string } | null) => void;
  updateOption: (
    option: Option,
    patch: { name?: string; active?: boolean; cycle?: Cycle },
  ) => Promise<void>;
  deleteOption: (option: Option) => Promise<void>;
  saving: boolean;
}) {
  const iconButton =
    "inline-flex items-center justify-center p-1 max-[1024px]:h-11 max-[1024px]:w-11";
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold">
        {icon}
        {title}
      </h2>
      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${option.active ? "bg-emerald-400" : "bg-slate-500"}`}
            />
            {editing?.id === option.id ? (
              <input
                autoFocus
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
                className={`min-w-0 flex-1 basis-40 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-base sm:text-sm ${touch}`}
              />
            ) : (
              <span
                className={`min-w-0 flex-1 basis-40 break-words text-sm ${option.active ? "" : "text-slate-500 line-through"}`}
              >
                {option.name}
              </span>
            )}
            <button
              onClick={() => void updateOption(option, { cycle: option.cycle === "LICENCE" ? "MASTER" : "LICENCE" })}
              className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${option.cycle === "MASTER" ? "border-purple-500/40 text-purple-300" : "border-blue-500/40 text-blue-300"} ${touch}`}
            >
              {option.cycle === "MASTER" ? "Master" : "Licence"}
            </button>
            {editing?.id === option.id ? (
              <button
                onClick={() =>
                  void updateOption(option, { name: editing.name })
                }
                disabled={saving}
                className={`rounded-lg bg-blue-600 px-2 py-1 text-xs ${touch}`}
              >
                Enregistrer
              </button>
            ) : (
              <button
                aria-label={`Modifier ${option.name}`}
                onClick={() => setEditing({ id: option.id, name: option.name })}
                className={`${iconButton} text-slate-400`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() =>
                void updateOption(option, { active: !option.active })
              }
              className={`rounded-lg border border-slate-700 px-2 py-1 text-xs ${touch}`}
            >
              {option.active ? "Désactiver" : "Activer"}
            </button>
            <button
              aria-label={`Supprimer ${option.name}`}
              onClick={() => void deleteOption(option)}
              className={`${iconButton} text-rose-400`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!options.length && (
          <p className="text-sm text-slate-500">Aucune option.</p>
        )}
      </div>
    </section>
  );
}
function DocumentRequirementList({
  title,
  requirements,
  editing,
  setEditing,
  updateRequirement,
  deleteRequirement,
  saving,
}: {
  title: string;
  requirements: DocumentRequirement[];
  editing: { id: string; label: string } | null;
  setEditing: (item: { id: string; label: string } | null) => void;
  updateRequirement: (requirement: DocumentRequirement, patch: { label?: string; active?: boolean; cycle?: Cycle }) => Promise<void>;
  deleteRequirement: (requirement: DocumentRequirement) => Promise<void>;
  saving: boolean;
}) {
  const iconButton = "inline-flex items-center justify-center p-1 max-[1024px]:h-11 max-[1024px]:w-11";
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold">
        <FileText className="h-4 w-4" />
        {title}
      </h2>
      <div className="space-y-2">
        {requirements.map((requirement) => (
          <div key={requirement.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${requirement.active ? "bg-emerald-400" : "bg-slate-500"}`} />
            {editing?.id === requirement.id ? (
              <input
                autoFocus
                value={editing.label}
                onChange={(event) => setEditing({ ...editing, label: event.target.value })}
                className={`min-w-0 flex-1 basis-40 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-base sm:text-sm ${touch}`}
              />
            ) : (
              <span className={`min-w-0 flex-1 basis-40 break-words text-sm ${requirement.active ? "" : "text-slate-500 line-through"}`}>
                {requirement.label}
              </span>
            )}
            {editing?.id === requirement.id ? (
              <button
                onClick={() => void updateRequirement(requirement, { label: editing.label })}
                disabled={saving}
                className={`rounded-lg bg-blue-600 px-2 py-1 text-xs ${touch}`}
              >
                Enregistrer
              </button>
            ) : (
              <button
                aria-label={`Modifier ${requirement.label}`}
                onClick={() => setEditing({ id: requirement.id, label: requirement.label })}
                className={`${iconButton} text-slate-400`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => void updateRequirement(requirement, { active: !requirement.active })}
              className={`rounded-lg border border-slate-700 px-2 py-1 text-xs ${touch}`}
            >
              {requirement.active ? "Désactiver" : "Activer"}
            </button>
            <button
              aria-label={`Supprimer ${requirement.label}`}
              onClick={() => void deleteRequirement(requirement)}
              className={`${iconButton} text-rose-400`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!requirements.length && (
          <p className="text-sm text-slate-500">Aucune pièce configurée.</p>
        )}
      </div>
    </section>
  );
}
function academicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function StepProgress({ steps, current }: { steps: FormStep[]; current: number }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-blue-400">
          Étape {current + 1} sur {steps.length} — {steps[current].title}
        </p>
      </div>
      <div className="mb-2 flex gap-1.5">
        {steps.map((item, index) => (
          <div
            key={item.title}
            className={`h-1.5 flex-1 rounded-full transition-colors ${index <= current ? "bg-blue-600" : "bg-slate-800"}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">{steps[current].description}</p>
    </div>
  );
}
function StepNav({
  step,
  totalSteps,
  onPrevious,
  onNext,
  submitDisabled,
  submitLabel,
}: {
  step: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  submitDisabled: boolean;
  submitLabel: string;
}) {
  const isLastStep = step === totalSteps - 1;
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-between">
      {step > 0 ? (
        <button
          type="button"
          onClick={onPrevious}
          className={`rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 sm:w-auto ${touch}`}
        >
          Précédent
        </button>
      ) : <span />}
      {isLastStep ? (
        <button disabled={submitDisabled} className={`rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold disabled:opacity-50 sm:w-auto ${touch}`}>
          <UserPlus className="mr-2 inline h-4 w-4" />
          {submitLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className={`rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold sm:w-auto ${touch}`}
        >
          Suivant
        </button>
      )}
    </div>
  );
}
function ProgramPicker({
  programs,
  value,
  onChange,
}: {
  programs: Option[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-300">Parcours</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {programs.map((program) => (
          <button
            key={program.id}
            type="button"
            onClick={() => onChange(program.name)}
            className={`rounded-xl border p-3 text-center text-sm font-semibold ${touch} ${value === program.name ? "border-blue-500 bg-blue-500/10 text-white" : "border-slate-700 bg-slate-950/60 text-slate-300"}`}
          >
            {program.name}
          </button>
        ))}
      </div>
      {!programs.length && (
        <p className="mt-2 text-xs text-amber-400">
          Aucun parcours actif pour ce cycle. Ajoutez-en dans Paramètres.
        </p>
      )}
    </div>
  );
}

function AttestationView({
  data,
  mention,
  onClose,
}: {
  data: AttestationData;
  mention: string;
  onClose: () => void;
}) {
  return (
    <div className="print-area fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-0 sm:items-center sm:p-4 print:static print:bg-white print:p-0">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-white p-6 text-slate-900 shadow-2xl sm:rounded-3xl print:max-h-none print:w-full print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-6 flex items-start justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Attestation d&apos;inscription</h2>
            <p className="text-xs text-slate-500">Étudiant ajouté avec succès</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} className="rounded-xl border border-slate-300 p-2 text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 border border-slate-300 p-6 text-sm">
          <h3 className="text-center text-base font-bold uppercase tracking-wide">Attestation d&apos;inscription</h3>
          <p><span className="font-semibold">Nom et Prénoms :</span> {data.fullName}</p>
          <p><span className="font-semibold">Date et lieu de naissance :</span> {data.birthDatePlace || "—"}</p>
          {mention && <p><span className="font-semibold">Mention :</span> {mention}</p>}
          <p><span className="font-semibold">Parcours :</span> {data.program} <span className="ml-6 font-semibold">Niveau :</span> {data.level}</p>
          <p><span className="font-semibold">Numéro d&apos;inscription :</span> {data.registrationNumber} <span className="ml-6 font-semibold">Tél. :</span> {data.phone}</p>
          <p><span className="font-semibold">E-mail :</span> {data.email}</p>
          <p className="pt-4">Est inscrit(e) à l&apos;ISSTM pour l&apos;Année Universitaire {academicYear()}.</p>
          <p>En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.</p>
          <p className="pt-6">Fait à Mahajanga, le {new Date().toLocaleDateString("fr-FR")}</p>
          <p className="pt-8 text-right font-semibold">Le Service de la Scolarité</p>
        </div>
        <div className="mt-6 flex justify-end gap-3 print:hidden">
          <button onClick={onClose} className={`rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 ${touch}`}>
            Fermer
          </button>
          <button onClick={() => window.print()} className={`flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white ${touch}`}>
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </section>
    </div>
  );
}

function DossierUploadPanel({
  documentTypes,
  uploadedTypes,
  uploadingType,
  onUpload,
  onFinish,
}: {
  documentTypes: DocumentType[];
  uploadedTypes: Set<string>;
  uploadingType: string | null;
  onUpload: (type: string, file: File) => void;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Dépôt de dossier</h3>
        <p className="text-xs text-slate-400">
          Téléversez les pièces justificatives requises pour ce dossier. Elles peuvent aussi être déposées plus tard depuis la fiche de l&apos;étudiant.
        </p>
      </div>
      <div className="space-y-2">
        {documentTypes.map((doc) => {
          const stored = uploadedTypes.has(doc.type);
          const uploading = uploadingType === doc.type;
          return (
            <div key={doc.type} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs">
              <span className="min-w-0 truncate text-slate-300">{doc.label}</span>
              <label className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold ${stored ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-600 text-white"} ${touch}`}>
                {uploading ? "Envoi…" : stored ? "Téléversé ✓" : "Téléverser"}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onUpload(doc.type, file);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end border-t border-slate-800 pt-5">
        <button type="button" onClick={onFinish} className={`rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold sm:w-auto ${touch}`}>
          Terminer
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`min-w-0 text-xs text-slate-300 ${className}`}>
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 max-[1024px]:min-h-[44px]"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <label className={`min-w-0 text-xs text-slate-300 ${className}`}>
      {label}
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 max-[1024px]:min-h-[44px]"
      >
        {options.length ? (
          options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))
        ) : (
          <option value="">Aucune option active</option>
        )}
      </select>
    </label>
  );
}