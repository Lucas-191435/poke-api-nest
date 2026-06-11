type IPokemonSpecies = {
  base_happiness: number;
  capture_rate: number;
  color: {
    name: string;
    url: string;
  };
  egg_groups: {
    name: string;
    url: string;
  }[];
  evolution_chain: {
    url: string;
  };
  evolves_from_species: {
    name: string;
    url: string;
  } | null;
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
      url: string;
    };
    version: {
      name: string;
      url: string;
    };
  }[];
};


export default IPokemonSpecies



