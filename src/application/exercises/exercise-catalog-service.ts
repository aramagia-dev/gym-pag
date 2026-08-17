import type { Exercise, EntityId } from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { ExerciseReferenceReader } from "./exercise-reference-reader";

export type ExerciseInput = Omit<Exercise, "id">;

export type ExerciseUpdateInput = ExerciseInput & {
  id: EntityId;
};

export type ExerciseIdGenerator = () => EntityId;

const defaultIdGenerator: ExerciseIdGenerator = () => crypto.randomUUID();

export class ExerciseCatalogService {
  constructor(
    private readonly repository: ExerciseRepository,
    private readonly idGenerator: ExerciseIdGenerator = defaultIdGenerator,
    private readonly referenceReader?: ExerciseReferenceReader,
  ) {}

  list(): Promise<Exercise[]> {
    return this.repository.findAll();
  }

  get(id: EntityId): Promise<Exercise | null> {
    return this.repository.findById(id);
  }

  async create(input: ExerciseInput): Promise<Exercise> {
    const { imageUrl, ...exerciseInput } = input;
    const exercise: Exercise = {
      ...exerciseInput,
      id: this.idGenerator(),
      name: this.normalizeName(input.name),
      ...this.normalizedImage(imageUrl),
    };

    await this.repository.create(exercise);
    return exercise;
  }

  async update(input: ExerciseUpdateInput): Promise<Exercise> {
    const { imageUrl, ...exerciseInput } = input;
    const exercise: Exercise = {
      ...exerciseInput,
      name: this.normalizeName(input.name),
      ...this.normalizedImage(imageUrl),
    };

    await this.repository.update(exercise);
    return exercise;
  }

  async delete(id: EntityId): Promise<void> {
    if (this.referenceReader && await this.repository.findById(id) && await this.referenceReader.isReferenced(id)) {
      throw new Error("No se puede eliminar el ejercicio porque está siendo usado en rutinas o en el historial de entrenamientos.");
    }

    await this.repository.deleteById(id);
  }

  private normalizeName(name: string): string {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
       throw new Error("El nombre del ejercicio no puede estar vacío.");
    }

    return trimmedName;
  }

  private normalizedImage(imageUrl: string | undefined): { imageUrl?: string } {
    if (!imageUrl?.trim()) return {};

    const normalizedImageUrl = imageUrl.trim();
    const isImageDataUrl = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+={0,2}$/i.test(normalizedImageUrl);
    let isHttpUrl = false;

    try {
      const url = new URL(normalizedImageUrl);
      isHttpUrl = url.protocol === "http:" || url.protocol === "https:";
    } catch {
      isHttpUrl = false;
    }

    if (!isImageDataUrl && !isHttpUrl) {
      throw new Error("La imagen debe ser un archivo de imagen válido o una URL http(s).");
    }

    return { imageUrl: normalizedImageUrl };
  }
}
