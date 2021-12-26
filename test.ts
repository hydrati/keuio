// deno-lint-ignore-file require-await
import { 
  Injectable,
  Inject,
  Get, Match, Query,
  Provider,
  Controller,

  run
} from './keuio/keuio.ts'

@Injectable()
class AA extends Provider {
  getText(name: string, age: string): string {
    return `Hello, ${name}, ${age}!`
  }
}

@Inject(AA)
class App extends Controller {
  constructor(
    private readonly provider: AA
  ) { super() }
  @Get("/hi/:name") 
  async print(
    @Match("name") name: string, 
    @Query("age") age: string
  ): Promise<string> {
    return this.provider.getText(name, age);
  }
}

await run(App)