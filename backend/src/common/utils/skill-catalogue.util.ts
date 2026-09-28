type SkillCatalogueClient = {
  skill: {
    upsert(args: any): Promise<SkillRow>;
    update(args: any): Promise<SkillRow>;
  };
};

interface SkillRow {
  id: string;
  name: string;
  displayName: string | null;
}

/**
 * Finds or creates a catalogue skill.
 *
 * name: Normalized lowercase key used for matching and uniqueness.
 * displayName: Original casing used for display.
 *
 * Existing properly-cased display names are preserved.
 * Legacy lowercase entries are upgraded when a properly-cased
 * spelling is supplied.
 */
export async function upsertSkillCatalogueEntry(
  client: SkillCatalogueClient,
  rawName: string,
): Promise<SkillRow> {
  const displayName = rawName.trim();
  const name = displayName.toLowerCase();

  const skill = await client.skill.upsert({
    where: { name },
    update: {},
    create: {
      name,
      displayName,
      category: 'General',
    },
  });

  const currentDisplayName = skill.displayName ?? skill.name;

  const isCurrentlyLowercase = currentDisplayName === skill.name;
  const incomingHasCasing = displayName !== name;

  if (isCurrentlyLowercase && incomingHasCasing) {
    return client.skill.update({
      where: { id: skill.id },
      data: { displayName },
    });
  }

  return skill;
}