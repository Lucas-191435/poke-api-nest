type Generation =
    | 'generation-i'
    | 'generation-ii'
    | 'generation-iii'
    | 'generation-iv'
    | 'generation-v'
    | 'generation-vi'
    | 'generation-vii'
    | 'generation-viii';

type Version =
    | 'red-blue'
    | 'yellow'
    | 'gold'
    | 'silver'
    | 'crystal'
    | 'ruby'
    | 'sapphire'
    | 'emerald'
    | 'firered'
    | 'leafgreen'
    | 'diamond'
    | 'pearl'
    | 'platinum'
    | 'heartgold'
    | 'soulsilver'
    | 'black'
    | 'white'
    | 'black-white'
    | 'white-2'
    | 'x'
    | 'y'
    | 'omega-ruby'
    | 'alpha-sapphire'
    | 'sun'
    | 'moon'
    | 'ultra-sun'
    | 'ultra-moon'
    | 'lets-go-pikachu'
    | 'lets-go-eevee'
    | 'sword'
    | 'shield'
    | 'brilliant-diamond'
    | 'shining-pearl'
    | 'legends-arceus'
    | 'scarlet'
    | 'violet';


export type IPokemonPokeAPi = {
    status: number,
    statusText: string,
    data: {
        id: number;
        name: string;
        base_experience: number;
        height: number;
        is_default: boolean;
        order: number;
        weight: number;
        abilities: {
            ability: {
                name: string;
                url: string;
            };
            is_hidden: boolean;
            slot: number;
        }[];
        forms: {
            name: string;
            url: string;
        }[];
        game_indices: {
            game_index: number;
            version: {
                name: string;
                url: string;
            };
        }[];
        held_items: {
            item: {
                name: string;
                url: string;
            };
            version_details: {
                rarity: number;
                version: {
                    name: string;
                    url: string;
                };
            }[];
        }[];
        location_area_encounters: string;
        moves: {
            move: {
                name: string;
                url: string;
            };
            version_group_details: {
                level_learned_at: number;
                move_learn_method: {
                    name: string;
                    url: string;
                };
                version_group: {
                    name: string;
                    url: string;
                };
            }[];
        }[];
        sprites: {
            back_default: string | null;
            back_female: string | null;
            back_shiny: string | null;
            back_shiny_female: string | null;
            front_default: string | null;
            front_female: string | null;
            front_shiny: string | null;
            front_shiny_female: string | null;
            other: {
                dream_world: {
                    front_default: string | null;
                    front_female: string | null;
                };
                home: {
                    front_default: string | null;
                    front_female: string | null;
                    front_shiny: string | null;
                    front_shiny_female: string | null;
                };
                "official-artwork": {
                    front_default: string | null;
                    front_shiny: string | null;
                };
                showdown: {
                    back_default: string | null;
                    back_female: string | null;
                    back_shiny: string | null;
                    back_shiny_female: string | null;
                    front_default: string | null;
                    front_female: string | null;
                    front_shiny: string | null;
                    front_shiny_female: string | null;
                };
            };
            versions: {
                [gen in Generation]?: {
                    [ver in Version]?: {
                        animated?: {
                            back_default: string | null;
                            back_female: string | null;
                            back_shiny: string | null;
                            back_shiny_female: string | null;
                            front_default: string | null;
                            front_female: string | null;
                            front_shiny: string | null;
                            front_shiny_female: string | null;
                        },
                        back_default: string | null;
                        back_female: string | null;
                        back_shiny: string | null;
                        back_shiny_female: string | null;
                        front_default: string | null;
                        front_female: string | null;
                        front_shiny: string | null;
                        front_shiny_female: string | null;
                    };
                };
            };
        };
        species: {
            name: string;
            url: string;
        };
        stats: {
            base_stat: number;
            effort: number;
            stat: {
                name: string;
                url: string;
            };
        }[];
        types: {
            slot: number;
            type: {
                name: string;
                url: string;
            };
        }[];
        past_types: any[]; // Pode ser tipado mais detalhadamente se necessário
    }
};
