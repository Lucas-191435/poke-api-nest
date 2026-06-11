export type IGetPokemonPokeAPi = {
    status: number,
    statusText: string,
    data: {
        count: number;
        next: string | null;
        previous: string | null;
        results: {
            name: string;
            url: string;
        }[];
    }
}