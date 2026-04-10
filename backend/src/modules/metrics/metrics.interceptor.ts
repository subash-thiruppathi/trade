import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(private readonly metricsService: MetricsService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const { method } = req;
        const route: string = req.route?.path ?? req.url ?? 'unknown';

        const end = this.metricsService.httpDuration.startTimer({ method, route });

        return next.handle().pipe(
            tap({
                next: () => {
                    const res = context.switchToHttp().getResponse();
                    end({ status_code: String(res.statusCode) });
                },
                error: () => {
                    end({ status_code: '500' });
                },
            }),
        );
    }
}
