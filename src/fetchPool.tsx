import fetch, { FetchError } from "node-fetch";


//@ts-ignore
import * as PromisePool from "@supercharge/promise-pool";



import type { Response, RequestInfo, RequestInit } from "node-fetch";
import * as lodash from "lodash";

const URL: string = "https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=MSC2190011436";

class fetchPool {
    concurrency: number;
    waitingList: Array<{ id: number, url: RequestInfo, init?: RequestInit, cb: any; }> = [];
    running: Map<number, Promise<Response>> = new Map();
    tmp = 0;

    constructor(concurrency: number) {
        this.concurrency = concurrency;
    }

    fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
        const id = this.tmp++;

        if (this.running.size < this.concurrency) {
            const promise: Promise<Response> = new Promise((resolve: (value: Response) => void, reject) =>
                fetch(url, init).then(res => resolve(res), rej => reject(rej))
            ).then((response: Response) => {
                this.running.delete(id);
                return response;
            });
            this.running.set(id, promise);
            return promise;
        } else {

        }




        //     .then(response => {
        //         return response;
        //     });
        // }



        //  const cb = function () {
        //      console.log(id + " called");
        //  };
        //  this.waitingList.push({ id, url, init, cb });
        //  this.populate();
        //  return new Promise(cb).then(
        //      async () => {
        //          console.log("resolve" + id);
        //          this.running.delete(id);
        //          this.populate();
        //          return await fetch(url, init);
        //      });
        // populate() {
        //     console.log("populatea");
        //     while (this.running.size < this.concurrency && this.waitingList.length > 0) {
        //         const task = this.waitingList.shift()!;
        //         const { cb } = task;
        //         cb();
        //     }
        // }
    }
}

// const pool = new fetchPool(10);


// (async () => {
//     console.log('start');
//     const x = (lodash.range(0, 1000).map(_ => pool.fetch(URL, { timeout: 1000 * 60 })));
//     const v = await Promise.all(x);
//     console.log(v);
// })();



function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

PromisePool.withConcurrency(1).for(lodash.range(0, 100000)).process(async v => {
    const res = await fetch(URL);
    console.log(v);
    console.log(res)
});
