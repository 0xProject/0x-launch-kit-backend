console.log("Hello world!"); // tslint:disable-line:no-console

const a = async (...args: string[]): Promise<void> => {
    console.log(`${args}`); // tslint:disable-line:no-console
};
