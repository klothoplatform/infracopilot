# @klotho::execution_unit {
#   id = "main"
# }

FROM public.ecr.aws/lambda/python:3.11

COPY . ${LAMBDA_TASK_ROOT}

RUN pip3 install \
        --target ${LAMBDA_TASK_ROOT} \
        -r ${LAMBDA_TASK_ROOT}/{{.ProjectFilePath}}

ENV PYTHONPATH=${LAMBDA_TASK_ROOT}:${PYTHONPATH}

CMD [ "klotho_runtime.dispatcher.handler" ]