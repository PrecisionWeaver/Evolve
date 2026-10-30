import { global, breakdown, webWorker, atrack } from './vars.js';
import { deepClone, adjustCosts, messageQueue, gameLoop } from './functions.js';
import { races, traits } from './races.js';
import { craftCost, tradeRatio, atomic_mass, tradeBuyPrice, tradeSellPrice } from './resources.js';
import { actions, checkAffordable } from './actions.js';
import { fuel_adjust, int_fuel_adjust } from './space.js';
import { shipCosts } from './truepath.js';
import { f_rate } from './industry.js';
import { armyRating } from './civics.js';
import { alevel } from './achieve.js';
import { loc } from './locale.js';

export function enableDebug(){
    if (global.settings.expose){
        window.evolve = {
            actions: deepClone(actions),
            races: deepClone(races),
            traits: deepClone(traits),
            tradeRatio: deepClone(tradeRatio),
            craftCost: deepClone(craftCost(true)),
            atomic_mass: deepClone(atomic_mass),
            f_rate: deepClone(f_rate),
            checkAffordable: deepClone(checkAffordable),
            adjustCosts: deepClone(adjustCosts),
            armyRating: deepClone(armyRating),
            tradeBuyPrice: deepClone(tradeBuyPrice),
            tradeSellPrice: deepClone(tradeSellPrice),
            fuel_adjust: deepClone(fuel_adjust),
            int_fuel_adjust: deepClone(int_fuel_adjust),
            alevel: deepClone(alevel),
            messageQueue: deepClone(messageQueue),
            loc: deepClone(loc),
            shipCosts: deepClone(shipCosts),
            updateDebugData: deepClone(updateDebugData),
            global: {},
            breakdown: {},
        };
    }
}

export function updateDebugData(){
    if (global.settings.expose){
        window.evolve.global = deepClone(global);
        window.evolve.craftCost = deepClone(craftCost(true)),
        window.evolve.breakdown = deepClone(breakdown);
    }
}

// Console helpers for speeding up play on a personal fork. Unlike window.evolve, these act on live game state.
export function enableDevTools(execGameLoops){
    const findRes = function(name){
        let key = Object.keys(global.resource).find((r) => r.toLowerCase() === String(name).toLowerCase());
        if (!key){
            throw new Error(`Unknown resource "${name}". Try dev.list()`);
        }
        return key;
    };
    const unlocked = function(){
        return Object.keys(global.resource).filter((r) => global.resource[r].display);
    };

    window.dev = {
        // Multiply game speed, e.g. dev.speed(10). Resets to 1x on reload.
        speed(n){
            if (typeof n === 'number' && n >= 1){
                webWorker.speed = Math.floor(n);
            }
            return `Game speed: ${webWorker.speed}x`;
        },
        // Instantly simulate a number of game days (game must be unpaused).
        skip(days = 1){
            if (!webWorker.s){
                return 'Game is paused';
            }
            const speed = webWorker.speed;
            webWorker.speed = 1;
            let periods = days * webWorker.longRatio;
            while (periods > 0){
                execGameLoops(Math.min(periods, webWorker.longRatio * 12));
                periods -= webWorker.longRatio * 12;
            }
            webWorker.speed = speed;
            return `Skipped ${days} days`;
        },
        // Add days of the built-in accelerated time (2x speed), capped at 11520.
        atime(days = 1000){
            gameLoop('stop');
            global.settings.at = Math.min(global.settings.at + days, 11520);
            atrack.t = global.settings.at;
            gameLoop('start');
            return `Accelerated time: ${global.settings.at} days`;
        },
        // Add an amount of a resource, e.g. dev.add('Lumber', 5000). Clamped to storage cap.
        add(name, amount){
            let res = global.resource[findRes(name)];
            let count = res.amount + amount;
            res.amount = res.max >= 0 ? Math.min(count, res.max) : count;
            return `${res.name}: ${res.amount}`;
        },
        // Fill one resource, or every unlocked resource, to its storage cap.
        fill(name){
            (name ? [findRes(name)] : unlocked()).forEach(function(r){
                if (global.resource[r].max >= 0){
                    global.resource[r].amount = global.resource[r].max;
                }
            });
            return name ? `${global.resource[findRes(name)].name} filled` : 'All capped resources filled';
        },
        // List unlocked resources with current amount and cap.
        list(){
            let table = {};
            unlocked().forEach(function(r){
                table[r] = { amount: global.resource[r].amount, max: global.resource[r].max };
            });
            console.table(table);
        },
        help(){
            return [
                'dev.speed(n)       - run the game n times faster (1 = normal)',
                'dev.skip(days)     - instantly simulate that many game days',
                'dev.atime(days)    - add built-in accelerated time (2x)',
                'dev.add(res, n)    - add n of a resource, capped at storage',
                'dev.fill(res?)     - fill a resource (or all) to storage cap',
                'dev.list()         - show unlocked resources',
            ].join('\n');
        },
    };
}
