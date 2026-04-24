import { describe, it, expect } from "vitest";
import {
  CorpusNotFoundError,
  EmbeddingError,
  GitHubFetchError,
  InvalidApiKeyError,
  MissingEnvError,
  RagServiceError,
  StoreError,
} from "./errors";

describe("RagServiceError hierarchy", () => {
  it("preserves instanceof for subclasses", () => {
    expect(new CorpusNotFoundError("x")).toBeInstanceOf(RagServiceError);
    expect(new MissingEnvError("X")).toBeInstanceOf(RagServiceError);
    expect(new GitHubFetchError("r", "bad")).toBeInstanceOf(RagServiceError);
    expect(new EmbeddingError("bad")).toBeInstanceOf(RagServiceError);
    expect(new StoreError("bad")).toBeInstanceOf(RagServiceError);
    expect(new InvalidApiKeyError()).toBeInstanceOf(RagServiceError);
  });

  it("sets distinct error names", () => {
    expect(new CorpusNotFoundError("z").name).toBe("CorpusNotFoundError");
    expect(new InvalidApiKeyError().name).toBe("InvalidApiKeyError");
  });
});
