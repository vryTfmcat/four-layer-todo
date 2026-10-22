import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import test from 'node:test';

const source=readFileSync(process.env.VIEWPORT_SOURCE_FILE??'src/ui/TodoWorkspace.tsx','utf8');
function effectAfter(marker){
  const start=source.indexOf('  useEffect(() => {',source.indexOf(marker));
  const end=source.indexOf('\n  }, [',start);
  assert.ok(start>=0&&end>start);
  return source.slice(start,source.indexOf('\n',end+1));
}
const resize=effectAfter('const movingTaskIdsRef');
const overlap=effectAfter('}, [canvasCards, canvasConnections, canvasTextNotes, hydrated, storage, dragging]);');
function run(persisted){
  let cards=[{id:'outside',x:777,y:333}],notes=[{id:'note',x:900,y:480}];
  let writes=0,observers=0,normalizations=0;
  const callbacks=[];
  const bindings={
    storage:persisted?{updateCanvasLayout(){}}:undefined,
    canvasRef:{current:{getBoundingClientRect:()=>({width:620,height:640})}},
    ResizeObserver:class{constructor(cb){callbacks.push(cb);observers++}observe(){}disconnect(){}},
    useEffect:fn=>fn(),hydrated:true,normalizedCanvasLayoutRef:{current:false},
    CANVAS_CARD_WIDTH:250,CANVAS_CARD_HEIGHT:280,CANVAS_SAFE_PADDING:28,CANVAS_TOP_SAFE_AREA:96,
    CANVAS_TEXT_NOTE_WIDTH:220,CANVAS_TEXT_NOTE_HEIGHT:100,canvasTextNotes:notes,
    setCanvasCards:fn=>{cards=fn(cards);writes++},setCanvasTextNotes:fn=>{notes=fn(notes);writes++},
    resolveCanvasCardOverlaps:items=>{normalizations++;return items},
  };
  Function(...Object.keys(bindings),stripTypeScriptTypes(resize+'\n'+overlap))( ...Object.values(bindings));
  for(const callback of callbacks)callback();
  return{cards,notes,writes,observers,normalizations};
}
test('persisted Canvas coordinates survive a narrow viewport mount and resize',()=>{
  const result=run(true);
  assert.deepEqual(result.cards,[{id:'outside',x:777,y:333}]);
  assert.deepEqual(result.notes,[{id:'note',x:900,y:480}]);
  assert.equal(result.writes,0);assert.equal(result.observers,0);assert.equal(result.normalizations,0);
});
test('standalone non-persisted workspace retains its viewport normalization',()=>{
  const result=run(false);
  assert.equal(result.observers,1);assert.equal(result.normalizations,1);assert.ok(result.writes>0);
  assert.deepEqual(result.cards,[{id:'outside',x:342,y:332}]);
});
