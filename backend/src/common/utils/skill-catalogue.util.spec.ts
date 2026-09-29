import { upsertSkillCatalogueEntry } from './skill-catalogue.util';

type Client = Parameters<typeof upsertSkillCatalogueEntry>[0];

const makeClient = (upserted: {
  id: string;
  name: string;
  displayName: string | null;
}) => {
  const skill = {
    upsert: jest.fn().mockResolvedValue(upserted),
    update: jest
      .fn()
      .mockImplementation(async ({ data }) => ({ ...upserted, ...data })),
  };
  return { skill, client: { skill } as unknown as Client };
};

describe('upsertSkillCatalogueEntry', () => {
  it('stores the lowercase key and the casing as typed, trimmed', async () => {
    const { skill, client } = makeClient({
      id: '1',
      name: 'typescript',
      displayName: 'TypeScript',
    });

    await upsertSkillCatalogueEntry(client, '  TypeScript ');

    expect(skill.upsert).toHaveBeenCalledWith({
      where: { name: 'typescript' },
      update: {},
      create: {
        name: 'typescript',
        displayName: 'TypeScript',
        category: 'General',
      },
    });
    expect(skill.update).not.toHaveBeenCalled();
  });

  it('upgrades a legacy lowercase entry when a cased spelling is supplied', async () => {
    const { skill, client } = makeClient({
      id: '1',
      name: 'java',
      displayName: null,
    });

    const result = await upsertSkillCatalogueEntry(client, 'Java');

    expect(skill.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { displayName: 'Java' },
    });
    expect(result.displayName).toBe('Java');
  });

  it('never overwrites an already-cased display name', async () => {
    const { skill, client } = makeClient({
      id: '1',
      name: 'typescript',
      displayName: 'TypeScript',
    });

    await upsertSkillCatalogueEntry(client, 'typescript');
    await upsertSkillCatalogueEntry(client, 'TYPESCRIPT');

    expect(skill.update).not.toHaveBeenCalled();
  });

  it('does not write when the user typed all lowercase', async () => {
    const { skill, client } = makeClient({
      id: '1',
      name: 'docker',
      displayName: 'docker',
    });

    await upsertSkillCatalogueEntry(client, 'docker');

    expect(skill.update).not.toHaveBeenCalled();
  });

  it('keeps symbols intact in both the key and the display name', async () => {
    const { skill, client } = makeClient({
      id: '1',
      name: 'c#',
      displayName: 'C#',
    });

    await upsertSkillCatalogueEntry(client, 'C#');

    expect(skill.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'c#' },
        create: expect.objectContaining({ displayName: 'C#' }),
      }),
    );
  });
});