import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryContract } from '../lib/game/major-campaign';
import { evaluateContract,contractInstruction } from '../lib/game/contracts';
void test('each optional contract objective pays only a positive bonus and leaves the base untouched',()=>{
  for(let i=32;i<37;i++) {
    const block=recoveryContract(i),c=block.contract!;
    const base=block.baseGross;
    const success=evaluateContract(c,{seconds:40,pristine:20,economicFinds:20,lowestCondition:90,thermalSeconds:0,initialSolid:1000,remainingSolid:100});
    const failure=evaluateContract(c,{seconds:10000,pristine:0,economicFinds:20,lowestCondition:30,thermalSeconds:60,initialSolid:1000,remainingSolid:900});
    assert.equal(success.bonus,c.objective.bonus);assert.equal(failure.bonus,0);
    assert.equal(block.baseGross,base);assert.match(contractInstruction(c),/optional bonus/);
  }
});
