import { randomUUID } from "node:crypto";
import {
  AnalyzeDiscoveryBody,
  AnalyzeDiscoveryResponse,
} from "@workspace/api-zod";
import { assessmentCatalog, type Assessment } from "../data/assessment-catalog";
import { analyzeWithGroq, GroqAnalysisError } from "./groq-analysis";
import { saveDiscovery, type DiscoveryRecord } from "./discovery-storage";

type AnalyzeInput = ReturnType<typeof AnalyzeDiscoveryBody.parse>;

export class InvalidDiscoveryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDiscoveryInputError";
  }
}

const scaleLabels = {
  ar: [
    "لا ينطبق عليّ أبداً",
    "ينطبق عليّ قليلاً",
    "ينطبق عليّ أحياناً",
    "ينطبق عليّ غالباً",
    "ينطبق عليّ تماماً",
  ],
  en: [
    "Not at all like me",
    "A little like me",
    "Sometimes like me",
    "Often like me",
    "Very much like me",
  ],
} as const;

function prepareAnswers(
  assessment: Assessment,
  input: AnalyzeInput,
): DiscoveryRecord["answers"] {
  const supplied = new Map<string, string>();
  for (const answer of input.answers) {
    if (supplied.has(answer.questionId)) {
      throw new InvalidDiscoveryInputError("Each question must have one answer.");
    }
    supplied.set(answer.questionId, answer.value);
  }

  if (supplied.size !== assessment.questions.length) {
    throw new InvalidDiscoveryInputError("Answer every question before submitting.");
  }

  return assessment.questions.map((question) => {
    const value = supplied.get(question.id);
    if (value === undefined) {
      throw new InvalidDiscoveryInputError("Answer every question before submitting.");
    }

    let answerLabelAr: string;
    let answerLabelEn: string;
    if (question.type === "scale") {
      if (!/^[1-5]$/.test(value)) {
        throw new InvalidDiscoveryInputError("A rating answer is outside the allowed range.");
      }
      const index = Number(value) - 1;
      answerLabelAr = scaleLabels.ar[index];
      answerLabelEn = scaleLabels.en[index];
    } else {
      const selectedOption = question.options.find(
        (option) => option.value === value,
      );
      if (!selectedOption) {
        throw new InvalidDiscoveryInputError("A selected answer is not one of the available options.");
      }
      answerLabelAr = selectedOption.labelAr;
      answerLabelEn = selectedOption.labelEn;
    }

    return {
      questionId: question.id,
      promptAr: question.promptAr,
      promptEn: question.promptEn,
      answerValue: value,
      answerLabelAr,
      answerLabelEn,
    };
  });
}

export async function analyzeAndSaveDiscovery(
  ownerToken: string,
  input: AnalyzeInput,
): Promise<DiscoveryRecord> {
  const assessment = assessmentCatalog.find(
    (candidate) => candidate.id === input.assessmentId,
  );
  if (!assessment) {
    throw new InvalidDiscoveryInputError("The selected assessment was not found.");
  }

  const answers = prepareAnswers(assessment, input);
  const questionsAndAnswers = assessment.questions.map((question, index) => {
    const answer = answers[index];
    return {
      question:
        input.language === "ar" ? question.promptAr : question.promptEn,
      answer:
        input.language === "ar"
          ? answer.answerLabelAr
          : answer.answerLabelEn,
      value: answer.answerValue,
    };
  });

  const report = await analyzeWithGroq({
    language: input.language,
    assessmentTitle:
      input.language === "ar" ? assessment.titleAr : assessment.titleEn,
    assessmentGroup: assessment.group,
    questionsAndAnswers,
  });

  let candidate: DiscoveryRecord;
  try {
    candidate = AnalyzeDiscoveryResponse.parse({
      id: randomUUID(),
      assessmentId: assessment.id,
      assessmentTitleAr: assessment.titleAr,
      assessmentTitleEn: assessment.titleEn,
      group: assessment.group,
      language: input.language,
      summary:
        report && typeof report === "object" && "summary" in report
          ? report.summary
          : "",
      createdAt: new Date().toISOString(),
      answers,
      report,
    });
  } catch {
    throw new GroqAnalysisError("Groq returned a report in an unexpected format");
  }

  const saved = await saveDiscovery(ownerToken, {
    assessmentId: candidate.assessmentId,
    assessmentTitleAr: candidate.assessmentTitleAr,
    assessmentTitleEn: candidate.assessmentTitleEn,
    group: candidate.group,
    language: candidate.language,
    summary: candidate.summary,
    answers: candidate.answers,
    report: candidate.report,
  });

  return AnalyzeDiscoveryResponse.parse(saved);
}
